# Future State: POC → MVP
### AI Front Desk — Coding Challenge

---

## Overview

The POC demonstrates a working AI front desk with accurate, handbook-grounded responses, a functional operator dashboard, and a tenant-aware data model. The two primary upgrade areas to move to a production MVP are: replacing file-based storage with a vector database for scale, and adding authentication and persistence to the operator layer.

Full-document context stuffing was chosen deliberately for the POC — it maximizes answer accuracy for handbook sizes that fit within the model's context window, eliminating retrieval failure as a failure mode entirely. The tradeoff is cost and scalability at volume, which is addressed in the MVP path below.

---

## POC Architecture (Current State)

### What It Does
- PDF/txt upload → text extraction → stored as `handbook.txt` per tenant at `/data/tenants/{tenantId}/handbook.txt`
- Every chat request passes the full handbook text to gpt-4o as context
- Logs stored as `logs.json` per tenant (local only — Vercel filesystem is read-only)
- Deployed as Express server serving Vite static build on Vercel

### Intentional POC Tradeoffs

These are known limitations accepted in exchange for maximum answer accuracy and fastest build time:

- **Full-doc stuffing over RAG** — no retrieval step means no retrieval failures. For a handbook that fits in the model's context window, this is strictly more accurate than chunked retrieval. Cost per query is higher than RAG at scale.
- **File-based storage** — tenant isolation enforced via folder structure. Sufficient for POC, maps cleanly to the DB-backed MVP path.
- **No authentication on operator routes** — explicitly out of scope for POC.
- **No log persistence on Vercel** — Vercel filesystem is read-only. Logs work fully in local development. Addressed in MVP via a database.

Note: these are not oversights. Each was a deliberate decision to prioritize response correctness and shipping speed over infrastructure sophistication.

---

## MVP Architecture (Production Path)

### Vector Storage with ChromaDB or pgvector

Replace flat .txt files with a vector database:

**Ingestion pipeline (on upload):**
- Extract text from PDF, allow other file types
- Chunk into ~500 token segments with ~50 token overlap
- Embed each chunk using an embeddings model (e.g. `text-embedding-3-small`)
- Store with metadata: `{ tenantId, documentId, chunkIndex, filename, uploadedAt }`
- On replace: filter by `{ tenantId, documentId }`, delete all matching vectors, re-ingest

**Query pipeline (on chat request):**
- Embed the parent's question using the same model
- Query vector DB with `tenantId` filter
- Retrieve top-K chunks by cosine similarity
- Pass only those chunks to gpt-4o as context

**Why this matters:**
- Tenant data isolation enforced at the DB layer, not folder structure
- Context sent to gpt-4o shrinks dramatically — faster, cheaper responses
- Scales to large or multi-document handbooks without hitting token limits
- Clean document versioning via `documentId + uploadedAt` metadata

**Stack recommendation:** pgvector on Supabase (free tier) — better Node.js ergonomics than ChromaDB, SQL-native, easy to inspect visually.

### Authentication
- Operator routes protected by JWT or session-based auth
- Each tenant has admin credentials scoped to their `tenantId`

### Log Persistence
- Logs moved from flat JSON files to a database table
- Enables querying, filtering, and analytics across tenants

### Multi-Document Support
- Schools upload multiple documents (handbook, lunch menu, holiday calendar)
- Each document gets its own `documentId` in the vector DB
- Individual documents can be deleted/replaced without affecting others

### Word Document Support (.doc / .docx)
The POC explicitly does not support .doc or .docx uploads. This was a deliberate scoping decision — the `mammoth` parsing library introduces complexity around embedded tables, images, and formatting artifacts that can degrade extracted text quality. Operators with Word documents are instructed to export as PDF before uploading.

In the MVP, .doc(x) support is a simple addition:
- Detect .doc(x) mimetype in the upload route
- Route to `mammoth` extractor instead of `pdf-parse`
- Add a post-processing cleanup step to strip formatting noise
- Rest of the ingestion pipeline is unchanged

### Analytics and Feedback Loop
- Question clustering to surface the most common handbook gaps
- Parent thumbs up/down on answers feeds a review queue for operators
- Low-confidence responses automatically flagged for handbook improvement
- Retry logic with exponential backoff on OpenAI rate limit (429) responses

---

## What Stays the Same

- The gpt-4o prompt structure and grounding approach (unless new model works better)
- The tenant-aware data model (`tenantId` on everything)
- The operator upload/delete/replace workflow
- The parent chat UX
- The `wasUncertain` flag and graceful fallback behavior

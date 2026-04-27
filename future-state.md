# Future State: POC → MVP

## Overview

This document describes where the **AI Front Desk** app stands today (prototype / POC) and the main upgrade path toward a production MVP. The prototype prioritizes handbook-grounded answers, a usable operator workflow, and a tenant-aware API—while accepting file-based storage and limited hosted-demo persistence.

Full-document context stuffing was chosen deliberately for the POC: it maximizes answer accuracy for handbook sizes that fit in the model context window and removes retrieval as a failure mode. The tradeoff is cost and scalability at volume, which the MVP path below addresses with RAG-style retrieval.

---

## POC / prototype — current state (as of repo)

### Product surface

- **Parent chat** (`/chat`) — mobile-oriented Q&A against the tenant handbook.
- **Operator dashboard** (`/operator`) — handbook upload / replace / remove, question log, tenant picker, create tenant (API-backed).
- **Intake form builder** (`/admin/form-builder`) — visual JSON Schema + UI Schema builder; templates load and save per tenant via API.

### Backend (Express + TypeScript)

API routes (all under `/api` unless noted):

| Area | Routes | Notes |
|------|--------|--------|
| Health | `GET /api/health` | Liveness check. |
| Chat | `POST /api/chat` | Body: `question`, `tenantId`. Uses OpenAI `gpt-4o`; appends to tenant logs when not blocked by hosted-demo flag (see below). |
| Handbook | `POST /api/handbook/upload`, `GET /api/handbook/:tenantId/status`, `DELETE /api/handbook/:tenantId` | PDF via `pdf-parse` (in-memory buffer); `.txt` plain text. Rejects Word uploads; other MIME types rejected. |
| Logs | `GET /api/logs/:tenantId`, `POST /api/logs/:tenantId` | Per-tenant `logs.json`. |
| Tenants | `GET /api/tenants`, `POST /api/tenants` | Lists tenant dirs under `data/tenants`; POST creates a new tenant folder with validated id. |
| Form template | `GET /api/form-template/:tenantId`, `POST …`, `PATCH …` | Persists `form-template.json` per tenant (JSON Schema + UI Schema + `updatedAt`). |

The server can also serve the Vite client build from `client/dist` in non-serverless runs (`index.ts`).

### Per-tenant data layout

Under `server/data/tenants/{tenantId}/` (repo includes a sample `sunshine-academy` tenant):

- `handbook.txt` — extracted/cleaned handbook text (`handbookStore`: normalization, optional trim from `PROGRAM OVERVIEW`, etc.).
- `logs.json` — question/answer log entries (`wasUncertain`, timestamps, ids).
- `form-template.json` — saved intake form definition for that school.

### Hosted demo (Vercel) vs local

When `VERCEL=1` is set at runtime (typical on Vercel):

- **Tenant creation** (`POST /api/tenants`) returns **403** — avoids writing new tenant dirs in the demo.
- **Form template save/update** (`POST` / `PATCH /api/form-template/...`) returns **403**.
- **Log file writes** (`appendLog` / `POST /api/logs`) are **no-ops** on disk — chat and manual log POSTs do not persist `logs.json` on the server filesystem.

Locally (without that flag), those flows write under `data/tenants/` as expected. Handbook routes are not gated the same way; behavior on serverless filesystems still depends on deployment constraints.

### Intentional prototype tradeoffs

- **Full-doc stuffing over RAG** — no retrieval step for the POC; higher token use per question; see MVP path.
- **File-based storage** — folder-per-tenant; fine for demo and local dev; replace with DB + object storage for production.
- **No authentication** on operator or admin routes — out of scope for this prototype.
- **Limited persistence on hosted demo** — gated writes above; README still applies: treat production persistence as an MVP item.

These are deliberate choices for correctness and speed of delivery, not accidental omissions.

### Quality / engineering (current repo)

- **Automated tests** — Vitest + Supertest for the server API and store modules; GitHub Actions runs `npm ci`, `npm run typecheck`, and `npm test`.
- **Typecheck** — `server/tsconfig.test.json` covers `src` + `tests` + Vitest config.
- **Coverage** — optional `npm run test:coverage` (V8); thresholds configured so large regressions fail CI.

---

## Testing — follow-ups (backlog)

Ideas captured here so they stay on the roadmap without blocking day-to-day work:

1. **Isolated test data directory** — Tests today create `test-{uuid}` tenants under `server/data/tenants/`, shared with local dev. A `TENANTS_ROOT` (or similar) env override pointing at `os.tmpdir()` would fully separate test runs from dev fixtures.
2. **Stable assertions vs copy** — Many tests match human-readable error strings with regex. Introducing stable error `code` fields in JSON responses would let messages evolve without breaking tests.
3. **Fixture assumptions** — `GET /api/tenants` tests expect `sunshine-academy` to exist. Document that contract or add an explicit test fixture bootstrap step.
4. **`readdir` failure path** — `tenants.ts` returns `{ tenants: [] }` if the tenants root cannot be read; hard to cover under ESM without module mocking; low priority defensive branch.
5. **Client tests** — No Vitest/React Testing Library setup on the client yet; adding it is a separate, larger effort (form builder is largely JSX + Redux).

---

## MVP architecture (production path)

### Vector storage with pgvector (or similar)

Replace flat files with a retrieval-backed pipeline:

**Ingestion (on upload):**

- Extract text from PDF; expand supported types as needed.
- Chunk into ~500-token segments with overlap.
- Embed chunks (e.g. `text-embedding-3-small`).
- Store with metadata: `{ tenantId, documentId, chunkIndex, filename, uploadedAt }`.
- On replace: delete vectors for `{ tenantId, documentId }`, then re-ingest.

**Query (on chat):**

- Embed the question; query vector DB with `tenantId` filter; top-K by similarity; pass chunks only to `gpt-4o`.

**Why:** tenant isolation at the data layer, smaller prompts (latency/cost), multi-handbook scale, versioning via metadata.

**Stack note:** pgvector on Supabase remains a strong default for Node + SQL + inspection.

### Authentication

- Protect operator and admin routes (JWT or session).
- Scope admin actions to `tenantId` (or org) the user owns.

### Log and form persistence

- Move logs and form templates from JSON files into tables (or a document store with query APIs).
- Align with real analytics and backup requirements.

### Multi-document support

- Multiple uploads per school (handbook, menus, calendars) with `documentId` in the vector store; delete/replace per document.

### Word documents (.doc / .docx)

The prototype rejects Word uploads and asks operators to export PDF first (keeps parsing scope small).

MVP addition: detect `.doc`/`.docx`, route to something like `mammoth`, post-process noise, then feed the same chunk/embed pipeline as PDFs.

### Analytics and feedback loop

- Cluster questions to find handbook gaps.
- Parent feedback (thumbs up/down) into an operator review queue.
- Tie low-confidence / `wasUncertain` patterns to handbook updates.
- Retries with backoff on OpenAI rate limits (429).

---

## What stays the same

- Grounded prompting philosophy: answers tied to school-provided content, explicit uncertainty handling.
- `tenantId` on requests and stored data.
- Operator workflows: upload / replace / remove handbook; review logs; configure intake forms (evolved into persisted templates in the prototype).
- Parent chat UX direction.
- `wasUncertain` (or equivalent) for operator review.

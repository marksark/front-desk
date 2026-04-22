# AI Front Desk

### Description

A lightweight, mobile-friendly AI front desk prototype for early education centers.
Parents ask questions in natural language. The AI answers instantly from the school's uploaded handbook — never guessing, never fabricating policy.

**Live demo:** https://ms-front-desk-app.vercel.app (note limitations of arch here vs local repo)

---

## Features

- **Parent Chat UI** — mobile-optimized chat at `/chat`
- **Operator Dashboard** — handbook management + question logs at `/operator`
- **Handbook Upload** — upload any PDF or .txt file as the knowledge base
- **Graceful Uncertainty** — uncertain answers flagged and logged for review
- **Tenant-aware** — data model supports multiple schools by design

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TypeScript |
| Backend | Express + TypeScript |
| AI | OpenAI gpt-4o |
| Storage | Flat .txt file per tenant |
| Deploy | Vercel |

---

## Local Setup

```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 2. Add your OpenAI API key
cp server/.env.example server/.env
# Edit server/.env and add: OPENAI_API_KEY=your_key_here

# 3. Run both client and server
npm run dev
```

Client runs at `http://localhost:3000`
Server runs at `http://localhost:3001`

---

## Usage

### As a Parent
1. Go to `/chat`
2. Ask any question about the school
3. The AI answers from the uploaded handbook

### As an Operator
1. Go to `/operator`
2. Upload your school's handbook (PDF or .txt)
3. View all questions asked in the Question Log tab
4. Replace or remove the handbook at any time

---

## Architecture Notes

- **Full-doc context stuffing** is used intentionally over RAG — eliminates retrieval failure for handbook sizes that fit in gpt-4o's context window for POC only
- **tenantId** on every route and data file — zero-cost multi-tenant readiness
- **pdf-parse + multer memory storage** — raw files never written to disk
- **wasUncertain flag** — tracked on every log entry for operator review

See `future-state.md` for the full POC → MVP upgrade path.

---

## Project Structure

```
/client          Vite + React + TypeScript
/server
  /src
    /routes      chat.ts, handbook.ts, logs.ts
    /lib         handbookStore.ts
    index.ts     Express app
  /api
    index.ts     Vercel serverless entry point
  /data
    /tenants
      /sunshine-academy
        handbook.txt   pre-loaded handbook
        logs.json      question log
```

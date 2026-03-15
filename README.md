# AI Front Desk (POC)

A lightweight AI-powered front desk prototype for early education centers.
Parents ask questions, AI answers from the school's uploaded handbook.

## Setup
1. Clone the repo
2. Copy server/.env.example to server/.env and add your OPENAI_API_KEY
3. npm install (from root)
4. npm run dev

## Architecture
- Vite + React + TypeScript (client)
- Express + TypeScript (server)
- OpenAI gpt-4o for answer generation
- Tenant-aware flat file storage (.txt per school)
- See future-state.md for the ChromaDB upgrade path

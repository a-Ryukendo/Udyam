## UdyamAssignment

A compact full‑stack implementation that mimics the first two steps of the Udyam registration process (Aadhaar + OTP initiation, PAN validation).

- **Frontend**: React (Vite + TypeScript) with dynamic form rendering from a JSON schema, real-time validation, and a simple step tracker
- **Backend**: Node.js (Express + TypeScript) with Zod validation and Prisma ORM (PostgreSQL)
- **Scraper**: Node + TypeScript using Cheerio; parses the provided HTML (`Form/text`) and emits a JSON schema used by the app

## Prerequisites

- Node.js: 20.19.0 or newer recommended (older 20.18.x works with warnings)
- npm: bundled with Node 20+
- PostgreSQL: 14+ (local or hosted)

## Project structure

- `frontend/` – React app (Vite + TS). Fetches `/api/schema` and renders steps dynamically
- `backend/` – Express API with Zod validation and Prisma for persistence
  - `prisma/schema.prisma` – DB schema
  - `assets/udyam_steps.json` – fallback JSON schema
- `scraper/` – Cheerio-based scraper that reads the attached HTML from `Programming/Form/text` and outputs `scraper/output/udyam_steps.json`

## Setup

1) Install dependencies

- Frontend
  - `cd UdyamAssignment/frontend`
  - `npm install`
- Backend
  - `cd UdyamAssignment/backend`
  - `npm install`
- Scraper
  - `cd UdyamAssignment/scraper`
  - `npm install`

2) Configure database

- Copy `UdyamAssignment/backend/.env.example` to `UdyamAssignment/backend/.env`
- Edit `DATABASE_URL` with your credentials, for example:
  - `postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public`

3) Initialize Prisma

- In `UdyamAssignment/backend`:
  - `npx prisma generate`
  - `npx prisma migrate dev --name init`

4) Generate schema JSON via scraper (optional – a fallback JSON is bundled)

- In `UdyamAssignment/scraper`:
  - `npm run scrape:file`
  - Output: `UdyamAssignment/scraper/output/udyam_steps.json`

5) Run servers

- Backend (port 4000):
  - `cd UdyamAssignment/backend`
  - `npm run dev`
- Frontend (port 5173):
  - `cd UdyamAssignment/frontend`
  - `npm run dev`
- Open `http://localhost:5173`

Note: The Vite dev server proxies `/api/*` calls to `http://localhost:4000`.

## API

- `GET /api/health` – health check
- `GET /api/schema` – JSON form schema for steps 1–2
- `POST /api/validate` – `{ stepId: 'aadhaar_otp' | 'pan_validation', data: Record<string,unknown> }`
- `POST /api/submit` – persists submission (Aadhaar, Name, Consent, PAN, and stepId)

## Validation rules

- Aadhaar: exactly 12 digits (`^\d{12}$`)
- PAN: `^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$`
- Consent: must be checked

## Notes

- The scraper reads the attached HTML at `Programming/Form/text` to infer Step 1 labels and builds a JSON schema; Step 2 uses the standard PAN regex.
- The frontend is mobile‑first and renders fields based on the fetched schema, with real-time validation.
- If you see Node engine warnings with Vite, update to Node 20.19+.

## Roadmap

- Add unit tests (Zod validation and API with Supertest)
- Add Dockerfiles and compose for one‑command spin‑up
- Add PIN-to-City/State auto-fill and a more detailed progress tracker

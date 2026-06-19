<div align="center">

<img src="lumina/public/brand/logo-full.svg" alt="Lumina Waves Productions" width="280" />

# Lumina Waves — Operations System

**نظام إدارة عمليات لومينا ويفز** — a bilingual (Arabic‑first), mobile‑first PWA for running a music‑production company.

[![CI](https://github.com/mahmoudamr512/lumina-waves/actions/workflows/ci.yml/badge.svg)](https://github.com/mahmoudamr512/lumina-waves/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-D4AF37.svg)](LICENSE)

</div>

---

## Overview

Lumina Waves Productions manages artists, contracts, and the artistic works it acquires rights to. This system organizes that operation end‑to‑end:

**Client / Artist → Master Contract → Annex → Work (with credits)**

It is grounded in Egyptian Copyright Law (Law 82/2002): every contract records a **grant type**, **territory**, **term**, and an explicit **Article‑149 coverage checklist**, and **moral rights (الحقوق الأدبية) are never acquired** — a permanent system rule. Lumina Waves is always *Party 2*; the National ID (الرقم القومي) is a client's natural key.

The interface is **Arabic‑first and RTL**, designed for non‑technical users (guided steps, big tap targets, plain language), and installable as a **PWA**.

## Brand

The gold‑on‑black **Lumina Waves** identity ships as **reusable React components** and standalone assets:

- `LuminaWaveMark`, `LuminaWordmark`, `LuminaLogo` — themeable (`gold` / `mono` / `currentColor`), animatable (an equalizer pulse, reduced‑motion safe), RTL‑safe, with collision‑free gradient ids.
- Standalone SVGs in [`lumina/public/brand/`](lumina/public/brand) plus generated PWA icons (`npm run icons`).

Design tokens (gold scale, ink surfaces, Cinzel + Tajawal fonts) live in `lumina/src/app/globals.css` via Tailwind v4 `@theme`.

## Features

| Area | Status |
|---|---|
| Auth (Auth.js v5 credentials) + 5‑role RBAC (ADMIN/OPERATIONS/LEGAL/FINANCE/VIEWER) | ✅ Phase 1 |
| Domain model + soft‑delete everywhere + 3‑day trash queue + full audit trail | ✅ Phase 1 |
| Sensitive‑field redaction (National IDs, financial terms, files) | ✅ Phase 1 |
| Rights model (grant types, Art‑149 coverage, moral‑rights rule) | ✅ Phase 1 |
| Clients management UI (branded, animated, RBAC‑aware) | ✅ Phase 1 |
| Contract generation (bilingual RTL PDF, Draft→Executed) | 🚧 Phase 2 |
| Arabic OCR ingest + Meilisearch full‑text search | 🚧 Phase 3 |
| Google Drive backup mirror (+ `data.json` per folder) | 🚧 Phase 4 |
| PWA install, i18n switch, transactional email, trash‑expiry cron | 🚧 Phase 5 |

## Tech stack

Next.js 16 (App Router, RSC, Server Actions) · TypeScript (strict) · Tailwind v4 · Framer Motion · PostgreSQL 16 + Prisma 7 (driver adapter) · Auth.js v5 · BullMQ + Redis · Meilisearch · Playwright (PDF + e2e) · Tesseract (Arabic OCR) · next‑pwa · Vitest.

## Getting started

> The application lives in the [`lumina/`](lumina) subdirectory.

**Prerequisites:** Node 22 and Docker.

```bash
cd lumina
cp .env.example .env                 # adjust as needed
docker compose up -d                 # Postgres + Redis + Meilisearch
npm install                          # runs `prisma generate` on postinstall
npx prisma migrate dev               # apply migrations
SEED_ADMIN_PASSWORD=changeme-now npx prisma db seed   # seed the ADMIN user
npm run dev                          # http://localhost:3000
```

The seed reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from the environment. In development, if no password is set it generates a random one and prints it once; in production it refuses to seed without an explicit password.

## Scripts (run inside `lumina/`)

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests (needs Postgres up) |
| `npm run e2e` | Playwright end‑to‑end tests |
| `npm run icons` | Regenerate PWA icons from the brand mark |
| `npm run worker` | Background job workers (later phases) |

## Architecture

- **Services are the only layer that mutates data** (`src/services/`). The UI calls them via Server Actions. This centralizes RBAC (`requireUser` + `can`), soft‑delete, audit logging, and sensitive‑field redaction.
- **Soft‑delete + audit are cross‑cutting:** a Prisma client extension filters out deleted rows across every read sink (fail‑closed); deletes flow into a 3‑day recoverable trash queue, then a `purgedAt` flag — nothing is ever hard‑deleted. Every mutation writes an `AuditLog` row.
- **Money is stored as integers** (`revenueShareBps` basis points, `minPayoutCents`).

## Testing & CI

`npm run test` runs unit tests against a real Postgres; `npm run e2e` runs the Playwright smoke flow (login → create → list). GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, typecheck, unit tests (with a Postgres service), build, and e2e on every push and pull request.

## License

[MIT](LICENSE) © 2026 Mahmoud Amr / Lumina Waves Productions.

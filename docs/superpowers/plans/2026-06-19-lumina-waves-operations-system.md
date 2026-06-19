# Lumina Waves Operations System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the internal operations system for Lumina Waves Productions — a bilingual (Arabic-first), mobile-first PWA that organizes clients, contracts, annexes, and artistic works with legally-grounded rights tracking, contract generation, Arabic OCR + search, soft-delete with audit trail, and Google Drive backup.

**Architecture:** A single Next.js 15 (App Router) full-stack application backed by PostgreSQL via Prisma. Long-running work (OCR, Drive sync, email, search indexing) runs on BullMQ workers backed by Redis. PDFs are rendered from HTML templates via Playwright (correct Arabic RTL). Full-text search uses a self-hosted Meilisearch instance (good Arabic tokenization + typo tolerance). Everything self-hosts on one Vultr VPS; localhost mirrors prod via Docker Compose (Postgres + Redis + Meilisearch).

**Tech Stack:** Next.js 15 (App Router, RSC, Server Actions), TypeScript (strict), PostgreSQL 16, Prisma 5, Auth.js v5 (NextAuth, credentials), BullMQ + Redis, Meilisearch, Playwright (PDF render) + Tesseract.js (OCR, Arabic), googleapis (Drive), Nodemailer (SMTP), next-intl (i18n/RTL), next-pwa, Vitest (unit), Playwright Test (e2e), Docker Compose (local infra).

---

## Global Constraints

Every task's requirements implicitly include this section. Values copied verbatim from the spec.

- **No hard deletes, ever.** All deletes are soft. Delete → 3-day trash queue (recoverable by Admin) → flagged purged but record + Drive file retained. Admin-only delete/purge.
- **Audit trail on every mutation** (create/update/delete/restore/purge): who, what, when, before/after.
- **5 RBAC roles:** `ADMIN`, `OPERATIONS`, `LEGAL`, `FINANCE`, `VIEWER`. Only `ADMIN` can purge the trash queue.
- **Sensitive fields** (financial terms, National IDs, contract files) are hidden from `OPERATIONS` and `VIEWER`. `FINANCE` is read-only on legal documents. `OPERATIONS` cannot see/edit financial terms.
- **Moral rights (الحقوق الأدبية) are never acquired** — a permanent, non-removable system rule. No grant type may claim them.
- **Article 149 compliance:** every contract/annex must store grant type + territory + term + an explicit coverage checklist. Unlisted rights are presumed retained by the artist.
- **Lumina Waves is always Party 2** (الطرف الثاني). Single company entity.
- **National ID (الرقم القومي)** is the natural unique key for a Client; 14 digits.
- **Bilingual AR/EN, Arabic-first, RTL.** Arabic legal terms must use the exact strings from the spec glossary (§11 of the spec).
- **Mobile-first PWA**, installable, simple for non-technical users: guided steps over dense forms, big tap targets, plain language.
- **Hosting:** dev = localhost (Docker Compose); prod = single Vultr VPS. Vultr chosen because outbound SMTP must work.
- **TypeScript strict mode on.** All money/percentages stored as integers (cents / basis points) — never floats.

---

## Architecture Decisions (resolving spec §12 open items)

| Concern | Decision | Rationale |
|---|---|---|
| ORM / DB | Prisma + PostgreSQL 16 | Type-safe, migrations, `jsonb` for `data.json` payloads |
| Auth | Auth.js v5 (NextAuth), credentials + bcrypt, DB sessions | Self-hosted, no third-party dependency |
| Authorization | Central `can(user, action, resource)` policy module + field-level redaction | One place to reason about RBAC |
| Soft-delete + audit | Prisma Client Extension (query + result) + `AuditLog` table written in a service layer | Cross-cutting, enforced centrally |
| Jobs | BullMQ + Redis | OCR, Drive sync, email, search indexing run off the request path |
| OCR | `OcrProvider` interface; default `TesseractProvider` (Arabic `ara` traineddata, self-hosted, free); `GoogleVisionProvider` as a drop-in for higher accuracy | Cost-effective default, swappable |
| PDF render | Playwright (headless Chromium) renders an HTML/CSS template → PDF, Amiri Arabic font embedded | Only reliable way to get correct Arabic RTL + tables |
| Search | Self-hosted Meilisearch | Strong Arabic tokenization, typo tolerance, trivial on one VPS |
| Drive | `googleapis` with a **Service Account** writing to a designated Shared Drive folder | No interactive OAuth refresh; headless-friendly |
| Email | Nodemailer over SMTP | Vultr permits outbound SMTP |
| i18n / RTL | `next-intl`, `<html dir>` switches with locale, CSS logical properties only | Arabic-first |
| Money | Integers — `revenueShareBps` (basis points), `minPayoutCents` | No float rounding in financial/legal data |

---

## File Structure

```
lumina/
├── docker-compose.yml                 # postgres, redis, meilisearch (local infra)
├── .env.example
├── prisma/
│   ├── schema.prisma                  # all models
│   ├── migrations/
│   └── seed.ts                        # roles, admin user, demo client
├── src/
│   ├── lib/
│   │   ├── db.ts                      # Prisma client + soft-delete/audit extension
│   │   ├── audit.ts                   # writeAudit()
│   │   ├── auth.ts                    # Auth.js config
│   │   ├── authz.ts                   # can(), redactSensitive()
│   │   ├── rights.ts                  # grant-type presets, coverage checklist, moral-rights rule
│   │   ├── arabic.ts                  # normalizeArabic()
│   │   ├── queue.ts                   # BullMQ queues + connection
│   │   ├── search.ts                  # Meilisearch client + index helpers
│   │   ├── pdf.ts                     # renderPdf(html) via Playwright
│   │   ├── drive.ts                   # Drive client + upsertFile/upsertJson
│   │   ├── mail.ts                    # sendMail()
│   │   └── ocr/
│   │       ├── provider.ts            # OcrProvider interface + factory
│   │       ├── tesseract.ts
│   │       └── google-vision.ts
│   ├── services/                      # domain logic (the only place that mutates data)
│   │   ├── clients.ts
│   │   ├── contracts.ts
│   │   ├── annexes.ts
│   │   ├── works.ts
│   │   ├── documents.ts               # upload + OCR + index
│   │   └── trash.ts                   # soft-delete queue, restore, purge
│   ├── workers/
│   │   ├── index.ts                   # worker entrypoint (separate process)
│   │   ├── ocr.worker.ts
│   │   ├── index.worker.ts            # search indexing
│   │   ├── drive.worker.ts            # backup mirror + data.json
│   │   └── mail.worker.ts
│   ├── templates/contracts/           # HTML contract templates per grant type
│   │   ├── _layout.ts                 # shared bilingual RTL shell + Amiri font
│   │   ├── full-assignment.ts
│   │   ├── exclusive-license.ts
│   │   ├── non-exclusive-license.ts
│   │   ├── management.ts
│   │   └── annex.ts
│   ├── messages/                      # next-intl
│   │   ├── ar.json
│   │   └── en.json
│   ├── app/                           # App Router (UI + route handlers)
│   │   ├── layout.tsx                 # <html dir> from locale
│   │   ├── (auth)/login/
│   │   ├── (app)/clients/
│   │   ├── (app)/contracts/
│   │   ├── (app)/works/
│   │   ├── (app)/search/
│   │   ├── (app)/trash/
│   │   └── api/...                    # webhooks/health only; mutations via Server Actions
│   └── middleware.ts                  # auth gate + locale
└── tests/
    ├── unit/                          # Vitest
    └── e2e/                           # Playwright Test
```

**Files that change together live together.** Domain logic is in `services/` — the only layer allowed to mutate data; UI calls services via Server Actions. This keeps RBAC, soft-delete, and audit enforced in one place.

---

# PHASE 1 — Foundation & Domain Core

Produces: a running app with auth, the 5 roles, the full data model, soft-delete + trash queue + audit trail, and CRUD for Clients/Contracts/Annexes/Works behind RBAC.

### Task 1: Project scaffold + local infra

**Files:**
- Create: `lumina/package.json`, `lumina/tsconfig.json`, `lumina/docker-compose.yml`, `lumina/.env.example`, `lumina/vitest.config.ts`

**Interfaces:**
- Produces: a Next.js 15 + TS app that builds; `docker compose up` gives Postgres/Redis/Meilisearch on localhost.

- [ ] **Step 1: Scaffold the app**

```bash
npx create-next-app@latest lumina --typescript --app --eslint --src-dir --no-tailwind --import-alias "@/*"
cd lumina
npm i prisma @prisma/client next-auth@beta bcryptjs bullmq ioredis meilisearch googleapis nodemailer next-intl
npm i -D vitest @vitest/coverage-v8 tsx @types/bcryptjs @types/nodemailer playwright
npx playwright install chromium
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write local infra compose file**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment: { POSTGRES_USER: lumina, POSTGRES_PASSWORD: lumina, POSTGRES_DB: lumina }
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
  meili:
    image: getmeili/meilisearch:v1.10
    environment: { MEILI_MASTER_KEY: devkey }
    ports: ["7700:7700"]
    volumes: ["meili:/meili_data"]
volumes: { pgdata: {}, meili: {} }
```

- [ ] **Step 3: Write `.env.example`**

```bash
DATABASE_URL="postgresql://lumina:lumina@localhost:5432/lumina"
REDIS_URL="redis://localhost:6379"
MEILI_HOST="http://localhost:7700"
MEILI_KEY="devkey"
AUTH_SECRET="change-me"
SMTP_URL="smtp://user:pass@host:587"
MAIL_FROM="ops@luminawaves.com"
DRIVE_FOLDER_ID=""
GOOGLE_SERVICE_ACCOUNT_JSON=""
OCR_PROVIDER="tesseract"
```

- [ ] **Step 4: Configure Vitest**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'
export default defineConfig({
  test: { environment: 'node', globals: true, include: ['tests/unit/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

- [ ] **Step 5: Verify it boots**

Run: `docker compose up -d && npm run build`
Expected: build succeeds; `docker compose ps` shows db, redis, meili healthy.

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "chore: scaffold Next.js app + local infra"
```

---

### Task 2: Arabic normalization utility (pure, TDD)

**Files:**
- Create: `src/lib/arabic.ts`
- Test: `tests/unit/arabic.test.ts`

**Interfaces:**
- Produces: `normalizeArabic(input: string): string` — strips diacritics/tatweel, unifies alef (أإآ→ا), yaa (ى→ي), taa-marbuta (ة→ه), folds digits. Consumed by search indexing and query.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/arabic.test.ts
import { normalizeArabic } from '@/lib/arabic'
test('unifies alef and strips diacritics', () => {
  expect(normalizeArabic('أَحْمَد')).toBe('احمد')
  expect(normalizeArabic('إسلام')).toBe('اسلام')
})
test('unifies taa marbuta and yaa, strips tatweel', () => {
  expect(normalizeArabic('مأســـاة')).toBe('ماساه')
  expect(normalizeArabic('مصطفى')).toBe('مصطفي')
})
test('folds arabic-indic digits', () => {
  expect(normalizeArabic('٢٠٢٦')).toBe('2026')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/arabic.test.ts`
Expected: FAIL — "Cannot find module '@/lib/arabic'".

- [ ] **Step 3: Implement**

```ts
// src/lib/arabic.ts
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g // marks + tatweel
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
export function normalizeArabic(input: string): string {
  return input
    .replace(DIACRITICS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/arabic.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/arabic.ts tests/unit/arabic.test.ts
git commit -m "feat: Arabic text normalization utility"
```

---

### Task 3: Prisma schema — domain model + soft-delete + audit

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `tests/unit/schema.test.ts`

**Interfaces:**
- Produces: models `User`, `Client`, `MasterContract`, `Annex`, `Work`, `Credit`, `Document`, `AuditLog`, enums `Role`, `GrantType`, `WorkStatus`, `DocStatus`, `RightsAxis`, `CreditRole`. Every domain row has `deletedAt`, `purgeAfter`. Consumed by all services.

- [ ] **Step 1: Write the schema**

```prisma
// prisma/schema.prisma  (append after generator/datasource)
enum Role { ADMIN OPERATIONS LEGAL FINANCE VIEWER }
enum GrantType { FULL_ASSIGNMENT EXCLUSIVE_LICENSE NON_EXCLUSIVE_LICENSE MANAGEMENT }
enum WorkStatus { PENDING_ANNEX LINKED }
enum DocStatus { DRAFT EXECUTED }
enum RightsAxis { MASTER PUBLISHING BOTH }
enum CreditRole { AUTHOR COMPOSER ARRANGER PERFORMER PRODUCER }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         Role     @default(VIEWER)
  createdAt    DateTime @default(now())
  deletedAt    DateTime?
  purgeAfter   DateTime?
}

model Client {
  id          String   @id @default(cuid())
  legalName   String
  stageName   String?
  nationalId  String   @unique               // الرقم القومي — natural key, sensitive
  address     String?
  phone       String?
  contracts   MasterContract[]
  createdAt   DateTime @default(now())
  deletedAt   DateTime?
  purgeAfter  DateTime?
}

model MasterContract {
  id              String   @id @default(cuid())
  client          Client   @relation(fields: [clientId], references: [id])
  clientId        String
  grantType       GrantType
  territory       String                       // EGYPT | MENA | WORLDWIDE
  termMonths      Int
  autoRenew       Boolean  @default(true)
  noticeDays      Int      @default(90)
  coverage        Json                         // string[] of coverage keys (Art.149)
  revenueShareBps Int?                         // sensitive (basis points)
  minPayoutCents  Int?                         // sensitive
  settlementFreq  String?                      // e.g. "SEMIANNUAL"
  signedDate      DateTime?
  annexes         Annex[]
  documents       Document[]
  createdAt       DateTime @default(now())
  deletedAt       DateTime?
  purgeAfter      DateTime?
}

model Annex {
  id          String   @id @default(cuid())
  contract    MasterContract @relation(fields: [contractId], references: [id])
  contractId  String
  number      Int                              // unique per contract
  annexDate   DateTime
  works       Work[]
  documents   Document[]
  createdAt   DateTime @default(now())
  deletedAt   DateTime?
  purgeAfter  DateTime?
  @@unique([contractId, number])
}

model Work {
  id          String   @id @default(cuid())
  title       String
  status      WorkStatus @default(PENDING_ANNEX)
  rightsAxis  RightsAxis @default(BOTH)
  annex       Annex?   @relation(fields: [annexId], references: [id])
  annexId     String?
  credits     Credit[]
  createdAt   DateTime @default(now())
  deletedAt   DateTime?
  purgeAfter  DateTime?
}

model Credit {
  id     String     @id @default(cuid())
  work   Work       @relation(fields: [workId], references: [id])
  workId String
  role   CreditRole
  name   String
}

model Document {
  id           String   @id @default(cuid())
  filename     String
  storagePath  String                          // local disk / volume path; sensitive
  status       DocStatus @default(DRAFT)
  ocrText      String?  @db.Text               // extracted searchable text
  contract     MasterContract? @relation(fields: [contractId], references: [id])
  contractId   String?
  annex        Annex?   @relation(fields: [annexId], references: [id])
  annexId      String?
  createdAt    DateTime @default(now())
  deletedAt    DateTime?
  purgeAfter   DateTime?
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String
  action    String                            // CREATE|UPDATE|DELETE|RESTORE|PURGE
  entity    String                            // "Client" | "MasterContract" | ...
  entityId  String
  before    Json?
  after     Json?
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Create migration**

Run: `npx prisma migrate dev --name init`
Expected: migration applied; `prisma/migrations/*/migration.sql` created.

- [ ] **Step 3: Write a schema sanity test**

```ts
// tests/unit/schema.test.ts
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
afterAll(() => db.$disconnect())
test('can create a client with national id', async () => {
  const c = await db.client.create({ data: { legalName: 'Test', nationalId: '28902102104713' } })
  expect(c.id).toBeTruthy()
  await db.client.delete({ where: { id: c.id } })
})
```

- [ ] **Step 4: Run it**

Run: `npx vitest run tests/unit/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma tests/unit/schema.test.ts
git commit -m "feat: domain schema with soft-delete + audit models"
```

---

### Task 4: Prisma client with soft-delete extension

**Files:**
- Create: `src/lib/db.ts`
- Test: `tests/unit/soft-delete.test.ts`

**Interfaces:**
- Produces: `db` (extended PrismaClient). Reads automatically exclude `deletedAt != null`; `db.$softDelete(model, id, purgeAfter)` and `db.$includeDeleted` escape hatch. Consumed by every service.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/soft-delete.test.ts
import { db } from '@/lib/db'
test('soft-deleted rows are hidden from normal reads', async () => {
  const c = await db.client.create({ data: { legalName: 'X', nationalId: '10000000000001' } })
  await db.$softDelete('Client', c.id, new Date(Date.now() + 3*864e5))
  expect(await db.client.findUnique({ where: { id: c.id } })).toBeNull()
  const raw = await db.$includeDeleted.client.findUnique({ where: { id: c.id } })
  expect(raw?.deletedAt).not.toBeNull()
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/soft-delete.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'
const SOFT_MODELS = ['User','Client','MasterContract','Annex','Work','Document']
const base = new PrismaClient()

export const db = base.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (SOFT_MODELS.includes(model)) args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async findUnique({ model, args, query }) {
        const row = await query(args)
        return SOFT_MODELS.includes(model) && (row as any)?.deletedAt ? null : row
      },
      async findFirst({ model, args, query }) {
        if (SOFT_MODELS.includes(model)) args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
    },
  },
  client: {
    $includeDeleted: base,
    async $softDelete(model: string, id: string, purgeAfter: Date) {
      // @ts-expect-error dynamic model access
      return base[model[0].toLowerCase() + model.slice(1)].update({
        where: { id }, data: { deletedAt: new Date(), purgeAfter },
      })
    },
  },
})
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/soft-delete.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts tests/unit/soft-delete.test.ts
git commit -m "feat: soft-delete Prisma extension"
```

---

### Task 5: Audit logging service

**Files:**
- Create: `src/lib/audit.ts`
- Test: `tests/unit/audit.test.ts`

**Interfaces:**
- Produces: `writeAudit({ actorId, action, entity, entityId, before, after })`. Consumed by all mutating services.

- [ ] **Step 1: Failing test**

```ts
// tests/unit/audit.test.ts
import { writeAudit } from '@/lib/audit'
import { db } from '@/lib/db'
test('writes an audit row', async () => {
  await writeAudit({ actorId: 'u1', action: 'CREATE', entity: 'Client', entityId: 'c1', after: { legalName: 'A' } })
  const rows = await db.auditLog.findMany({ where: { entityId: 'c1' } })
  expect(rows[0].action).toBe('CREATE')
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/audit.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/audit.ts
import { db } from '@/lib/db'
export type AuditInput = {
  actorId: string; action: 'CREATE'|'UPDATE'|'DELETE'|'RESTORE'|'PURGE'
  entity: string; entityId: string; before?: unknown; after?: unknown
}
export async function writeAudit(i: AuditInput) {
  await db.auditLog.create({ data: {
    actorId: i.actorId, action: i.action, entity: i.entity, entityId: i.entityId,
    before: (i.before ?? null) as any, after: (i.after ?? null) as any,
  }})
}
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audit.ts tests/unit/audit.test.ts
git commit -m "feat: audit logging service"
```

---

### Task 6: Authorization policy + sensitive-field redaction

**Files:**
- Create: `src/lib/authz.ts`
- Test: `tests/unit/authz.test.ts`

**Interfaces:**
- Produces:
  - `can(role: Role, action: Action, entity: Entity): boolean`
  - `redactSensitive<T>(role: Role, entity: Entity, row: T): T` — nulls `nationalId`, `revenueShareBps`, `minPayoutCents`, `storagePath` for `OPERATIONS`/`VIEWER`.
  - Types `Action = 'create'|'read'|'update'|'delete'|'purge'`, `Entity = 'Client'|'MasterContract'|'Annex'|'Work'|'Document'|'Trash'`.

- [ ] **Step 1: Failing test**

```ts
// tests/unit/authz.test.ts
import { can, redactSensitive } from '@/lib/authz'
test('only admin can purge', () => {
  expect(can('ADMIN','purge','Trash')).toBe(true)
  expect(can('LEGAL','purge','Trash')).toBe(false)
})
test('operations cannot read financial terms', () => {
  const row = { id:'1', revenueShareBps: 7000, nationalId:'123' } as any
  expect(redactSensitive('OPERATIONS','MasterContract',row).revenueShareBps).toBeNull()
  expect(redactSensitive('FINANCE','MasterContract',{...row}).revenueShareBps).toBe(7000)
})
test('operations cannot read national id', () => {
  expect(redactSensitive('VIEWER','Client',{ nationalId:'123' } as any).nationalId).toBeNull()
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/authz.ts
import type { Role } from '@prisma/client'
export type Action = 'create'|'read'|'update'|'delete'|'purge'
export type Entity = 'Client'|'MasterContract'|'Annex'|'Work'|'Document'|'Trash'

export function can(role: Role, action: Action, entity: Entity): boolean {
  if (role === 'ADMIN') return true
  if (action === 'delete') return false          // delete is Admin-only (trash) — see trash service
  if (action === 'purge') return false
  switch (role) {
    case 'OPERATIONS': return ['create','read','update'].includes(action) && entity !== 'Trash'
    case 'LEGAL':      return ['create','read','update'].includes(action)
    case 'FINANCE':    return action === 'read'   // read-only across the board
    case 'VIEWER':     return action === 'read'
    default:           return false
  }
}

const SENSITIVE: Record<string, string[]> = {
  Client: ['nationalId'],
  MasterContract: ['revenueShareBps','minPayoutCents'],
  Document: ['storagePath'],
}
export function redactSensitive<T extends Record<string, any>>(role: Role, entity: Entity, row: T): T {
  if (role !== 'OPERATIONS' && role !== 'VIEWER') return row
  for (const f of SENSITIVE[entity] ?? []) if (f in row) (row as any)[f] = null
  return row
}
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authz.ts tests/unit/authz.test.ts
git commit -m "feat: RBAC policy + sensitive-field redaction"
```

---

### Task 7: Rights presets + moral-rights rule

**Files:**
- Create: `src/lib/rights.ts`
- Test: `tests/unit/rights.test.ts`

**Interfaces:**
- Produces: `GRANT_TYPES` (id → {ar,en}), `COVERAGE` (key → {ar,en}), `MORAL_RIGHTS_NOTE` (ar/en, constant), `validateGrant({grantType,territory,coverage})` throws if coverage empty (Art. 149).

- [ ] **Step 1: Failing test**

```ts
// tests/unit/rights.test.ts
import { GRANT_TYPES, COVERAGE, validateGrant, MORAL_RIGHTS_NOTE } from '@/lib/rights'
test('grant types carry correct Arabic', () => {
  expect(GRANT_TYPES.FULL_ASSIGNMENT.ar).toBe('تنازل كامل عن الحقوق المالية')
  expect(GRANT_TYPES.EXCLUSIVE_LICENSE.ar).toBe('ترخيص حصري')
})
test('coverage includes sync and RBT with correct Arabic', () => {
  expect(COVERAGE.SYNC.ar).toBe('المزامنة')
  expect(COVERAGE.RBT.ar).toBe('نغمة الانتظار')
})
test('empty coverage is rejected (Article 149)', () => {
  expect(() => validateGrant({ grantType:'EXCLUSIVE_LICENSE', territory:'EGYPT', coverage:[] }))
    .toThrow(/coverage/i)
})
test('moral rights note is non-empty and Arabic', () => {
  expect(MORAL_RIGHTS_NOTE.ar).toContain('الحقوق الأدبية')
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/rights.ts
export const GRANT_TYPES = {
  FULL_ASSIGNMENT:       { ar: 'تنازل كامل عن الحقوق المالية', en: 'Full economic-rights buyout' },
  EXCLUSIVE_LICENSE:     { ar: 'ترخيص حصري',                   en: 'Exclusive license' },
  NON_EXCLUSIVE_LICENSE: { ar: 'ترخيص غير حصري',               en: 'Non-exclusive license' },
  MANAGEMENT:            { ar: 'عقد إدارة',                     en: 'Management only' },
} as const

export const COVERAGE = {
  DIGITAL:       { ar: 'التوزيع الرقمي والبث التدفقي', en: 'Digital / streaming' },
  BROADCAST:     { ar: 'البث الإذاعي والتلفزيوني',     en: 'Broadcast' },
  PUBLIC_PERF:   { ar: 'الأداء العلني',                en: 'Public performance' },
  SYNC:          { ar: 'المزامنة',                     en: 'Synchronization' },
  RBT:           { ar: 'نغمة الانتظار',                en: 'RBT / ringback tone' },
  MECHANICAL:    { ar: 'الحقوق الميكانيكية',           en: 'Mechanical' },
  NAME_IMAGE:    { ar: 'الاسم والصورة',                en: 'Name & image' },
} as const

export const MORAL_RIGHTS_NOTE = {
  ar: 'تظل الحقوق الأدبية (حق النسبة وحق سلامة المصنف) ملكًا دائمًا للمؤلف ولا يجوز التنازل عنها.',
  en: 'Moral rights (attribution and integrity) remain perpetually with the author and can never be assigned.',
} as const

export type GrantInput = { grantType: keyof typeof GRANT_TYPES; territory: string; coverage: string[] }
export function validateGrant(g: GrantInput) {
  if (!GRANT_TYPES[g.grantType]) throw new Error('invalid grant type')
  if (!['EGYPT','MENA','WORLDWIDE'].includes(g.territory)) throw new Error('invalid territory')
  if (!g.coverage?.length) throw new Error('coverage must list at least one right (Article 149)')
  for (const k of g.coverage) if (!(k in COVERAGE)) throw new Error(`unknown coverage: ${k}`)
}
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rights.ts tests/unit/rights.test.ts
git commit -m "feat: rights presets, coverage checklist, moral-rights rule"
```

---

### Task 8: Auth.js setup + seed admin

**Files:**
- Create: `src/lib/auth.ts`, `src/app/(auth)/login/page.tsx`, `prisma/seed.ts`
- Modify: `src/middleware.ts`
- Test: `tests/unit/password.test.ts`

**Interfaces:**
- Produces: `auth()` (server session helper returning `{ user: { id, role } }`), `requireUser(action, entity)` guard used by services, a seeded `ADMIN` user.

- [ ] **Step 1: Failing test (password hashing round-trip)**

```ts
// tests/unit/password.test.ts
import { hashPassword, verifyPassword } from '@/lib/auth'
test('hash + verify', async () => {
  const h = await hashPassword('s3cret')
  expect(await verifyPassword('s3cret', h)).toBe(true)
  expect(await verifyPassword('wrong', h)).toBe(false)
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement auth config + helpers**

```ts
// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { can, type Action, type Entity } from '@/lib/authz'

export const hashPassword = (p: string) => bcrypt.hash(p, 12)
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h)

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(c) {
      const user = await db.user.findUnique({ where: { email: String(c?.email) } })
      if (!user || !(await verifyPassword(String(c?.password), user.passwordHash))) return null
      return { id: user.id, email: user.email, name: user.name, role: user.role }
    },
  })],
  callbacks: {
    jwt({ token, user }) { if (user) token.role = (user as any).role; return token },
    session({ session, token }) { (session.user as any).role = token.role; (session.user as any).id = token.sub; return session },
  },
})

export async function requireUser(action: Action, entity: Entity) {
  const s = await auth()
  if (!s?.user) throw new Error('UNAUTHENTICATED')
  const role = (s.user as any).role
  if (!can(role, action, entity)) throw new Error('FORBIDDEN')
  return { id: (s.user as any).id as string, role }
}
```

- [ ] **Step 4: Write the seed**

```ts
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const db = new PrismaClient()
async function main() {
  await db.user.upsert({
    where: { email: 'admin@luminawaves.com' },
    update: {},
    create: { email: 'admin@luminawaves.com', name: 'Admin', role: 'ADMIN',
      passwordHash: await bcrypt.hash('changeme', 12) },
  })
}
main().finally(() => db.$disconnect())
```
Add to `package.json`: `"prisma": { "seed": "tsx prisma/seed.ts" }`.

- [ ] **Step 5: Run test + seed**

Run: `npx vitest run tests/unit/password.test.ts` → PASS.
Run: `npx prisma db seed` → creates admin.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts prisma/seed.ts src/middleware.ts "src/app/(auth)" tests/unit/password.test.ts package.json
git commit -m "feat: Auth.js credentials auth + admin seed + requireUser guard"
```

---

### Task 9: Client service (CRUD + soft-delete + audit + RBAC)

**Files:**
- Create: `src/services/clients.ts`
- Test: `tests/unit/clients.service.test.ts`

**Interfaces:**
- Consumes: `db`, `requireUser`, `writeAudit`, `redactSensitive`.
- Produces:
  - `createClient(input: { legalName; stageName?; nationalId; address?; phone? })`
  - `getClient(id)` (redacted by role), `listClients()`
  - `updateClient(id, patch)`, `softDeleteClient(id)` (Admin-only via `requireUser('delete','Client')`).

- [ ] **Step 1: Failing test**

```ts
// tests/unit/clients.service.test.ts  (auth mocked)
import { vi } from 'vitest'
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'admin', role: 'ADMIN' })) }))
import { createClient, getClient } from '@/services/clients'
test('create then read client', async () => {
  const c = await createClient({ legalName: 'Ahmed Alaa', nationalId: '28902102104713' })
  const read = await getClient(c.id)
  expect(read?.legalName).toBe('Ahmed Alaa')
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/services/clients.ts
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { redactSensitive } from '@/lib/authz'

export async function createClient(input: {
  legalName: string; stageName?: string; nationalId: string; address?: string; phone?: string
}) {
  const u = await requireUser('create', 'Client')
  const row = await db.client.create({ data: input })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Client', entityId: row.id, after: row })
  return row
}
export async function getClient(id: string) {
  const u = await requireUser('read', 'Client')
  const row = await db.client.findUnique({ where: { id } })
  return row ? redactSensitive(u.role, 'Client', row) : null
}
export async function listClients() {
  const u = await requireUser('read', 'Client')
  const rows = await db.client.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map((r) => redactSensitive(u.role, 'Client', r))
}
export async function updateClient(id: string, patch: Partial<{ legalName: string; stageName: string; address: string; phone: string }>) {
  const u = await requireUser('update', 'Client')
  const before = await db.client.findUnique({ where: { id } })
  const after = await db.client.update({ where: { id }, data: patch })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'Client', entityId: id, before, after })
  return after
}
export async function softDeleteClient(id: string) {
  const u = await requireUser('delete', 'Client')   // Admin-only via can()
  const before = await db.client.findUnique({ where: { id } })
  await db.$softDelete('Client', id, new Date(Date.now() + 3 * 864e5))
  await writeAudit({ actorId: u.id, action: 'DELETE', entity: 'Client', entityId: id, before })
}
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/clients.ts tests/unit/clients.service.test.ts
git commit -m "feat: client service with RBAC, soft-delete, audit"
```

---

### Task 10: Contract, Annex, Work services

**Files:**
- Create: `src/services/contracts.ts`, `src/services/annexes.ts`, `src/services/works.ts`
- Test: `tests/unit/contracts.service.test.ts`

**Interfaces:**
- Consumes: `db`, `requireUser`, `writeAudit`, `redactSensitive`, `validateGrant`.
- Produces:
  - `createContract({ clientId, grantType, territory, termMonths, coverage, revenueShareBps?, minPayoutCents?, ... })` — calls `validateGrant` first.
  - `createAnnex({ contractId, annexDate })` — auto-assigns `number = max(existing)+1`.
  - `createWork({ title, rightsAxis, annexId?, credits })`; `linkWorkToAnnex(workId, annexId)` flips status `PENDING_ANNEX→LINKED`.

- [ ] **Step 1: Failing test (annex auto-numbering + grant validation)**

```ts
// tests/unit/contracts.service.test.ts
import { vi } from 'vitest'
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'admin', role: 'ADMIN' })) }))
import { createContract } from '@/services/contracts'
import { createAnnex } from '@/services/annexes'
import { createClient } from '@/services/clients'

test('annexes auto-number per contract', async () => {
  const c = await createClient({ legalName: 'C', nationalId: '10000000000099' })
  const k = await createContract({ clientId: c.id, grantType: 'EXCLUSIVE_LICENSE',
    territory: 'WORLDWIDE', termMonths: 36, coverage: ['DIGITAL'] })
  const a1 = await createAnnex({ contractId: k.id, annexDate: new Date() })
  const a2 = await createAnnex({ contractId: k.id, annexDate: new Date() })
  expect(a1.number).toBe(1); expect(a2.number).toBe(2)
})
test('contract with empty coverage rejected', async () => {
  const c = await createClient({ legalName: 'C2', nationalId: '10000000000098' })
  await expect(createContract({ clientId: c.id, grantType: 'EXCLUSIVE_LICENSE',
    territory: 'EGYPT', termMonths: 12, coverage: [] })).rejects.toThrow(/coverage/i)
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement contracts.ts**

```ts
// src/services/contracts.ts
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { redactSensitive } from '@/lib/authz'
import { validateGrant } from '@/lib/rights'

export async function createContract(input: {
  clientId: string; grantType: 'FULL_ASSIGNMENT'|'EXCLUSIVE_LICENSE'|'NON_EXCLUSIVE_LICENSE'|'MANAGEMENT'
  territory: string; termMonths: number; coverage: string[]
  autoRenew?: boolean; noticeDays?: number
  revenueShareBps?: number; minPayoutCents?: number; settlementFreq?: string; signedDate?: Date
}) {
  const u = await requireUser('create', 'MasterContract')
  validateGrant({ grantType: input.grantType, territory: input.territory, coverage: input.coverage })
  const row = await db.masterContract.create({ data: { ...input, coverage: input.coverage } })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'MasterContract', entityId: row.id, after: row })
  return redactSensitive(u.role, 'MasterContract', row)
}
export async function getContract(id: string) {
  const u = await requireUser('read', 'MasterContract')
  const row = await db.masterContract.findUnique({ where: { id }, include: { annexes: true, client: true } })
  return row ? redactSensitive(u.role, 'MasterContract', row) : null
}
```

- [ ] **Step 4: Implement annexes.ts**

```ts
// src/services/annexes.ts
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function createAnnex(input: { contractId: string; annexDate: Date }) {
  const u = await requireUser('create', 'Annex')
  const last = await db.annex.findFirst({ where: { contractId: input.contractId }, orderBy: { number: 'desc' } })
  const number = (last?.number ?? 0) + 1
  const row = await db.annex.create({ data: { contractId: input.contractId, annexDate: input.annexDate, number } })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Annex', entityId: row.id, after: row })
  return row
}
```

- [ ] **Step 5: Implement works.ts**

```ts
// src/services/works.ts
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

type CreditInput = { role: 'AUTHOR'|'COMPOSER'|'ARRANGER'|'PERFORMER'|'PRODUCER'; name: string }
export async function createWork(input: {
  title: string; rightsAxis?: 'MASTER'|'PUBLISHING'|'BOTH'; annexId?: string; credits: CreditInput[]
}) {
  const u = await requireUser('create', 'Work')
  const row = await db.work.create({ data: {
    title: input.title, rightsAxis: input.rightsAxis ?? 'BOTH',
    annexId: input.annexId, status: input.annexId ? 'LINKED' : 'PENDING_ANNEX',
    credits: { create: input.credits },
  }, include: { credits: true } })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Work', entityId: row.id, after: row })
  return row
}
export async function linkWorkToAnnex(workId: string, annexId: string) {
  const u = await requireUser('update', 'Work')
  const row = await db.work.update({ where: { id: workId }, data: { annexId, status: 'LINKED' } })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'Work', entityId: workId, after: row })
  return row
}
```

- [ ] **Step 6: Run tests to verify pass** → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/services/contracts.ts src/services/annexes.ts src/services/works.ts tests/unit/contracts.service.test.ts
git commit -m "feat: contract/annex/work services with grant validation + auto-numbering"
```

---

### Task 11: Trash queue service (restore + purge)

**Files:**
- Create: `src/services/trash.ts`
- Test: `tests/unit/trash.service.test.ts`

**Interfaces:**
- Consumes: `db.$includeDeleted`, `requireUser`, `writeAudit`.
- Produces: `listTrash()`, `restore(entity, id)`, `purge(entity, id)` (Admin-only), `purgeExpired()` (called by a cron worker; purges rows whose `purgeAfter < now`).

- [ ] **Step 1: Failing test**

```ts
// tests/unit/trash.service.test.ts
import { vi } from 'vitest'
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'admin', role: 'ADMIN' })) }))
import { createClient, softDeleteClient } from '@/services/clients'
import { listTrash, restore } from '@/services/trash'
test('soft-deleted client appears in trash and can be restored', async () => {
  const c = await createClient({ legalName: 'R', nationalId: '10000000000077' })
  await softDeleteClient(c.id)
  expect((await listTrash()).some((t) => t.id === c.id)).toBe(true)
  await restore('Client', c.id)
  expect((await listTrash()).some((t) => t.id === c.id)).toBe(false)
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/services/trash.ts
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

const MODELS = ['Client','MasterContract','Annex','Work','Document'] as const
type Model = typeof MODELS[number]
const accessor = (m: Model) => (db.$includeDeleted as any)[m[0].toLowerCase() + m.slice(1)]

export async function listTrash() {
  await requireUser('read', 'Trash')
  const out: { id: string; entity: Model; deletedAt: Date; purgeAfter: Date|null }[] = []
  for (const m of MODELS) {
    const rows = await accessor(m).findMany({ where: { deletedAt: { not: null } } })
    for (const r of rows) out.push({ id: r.id, entity: m, deletedAt: r.deletedAt, purgeAfter: r.purgeAfter })
  }
  return out
}
export async function restore(entity: Model, id: string) {
  const u = await requireUser('delete', entity)  // restore is an Admin-level op
  await accessor(entity).update({ where: { id }, data: { deletedAt: null, purgeAfter: null } })
  await writeAudit({ actorId: u.id, action: 'RESTORE', entity, entityId: id })
}
export async function purge(entity: Model, id: string) {
  const u = await requireUser('purge', 'Trash')  // Admin-only
  // flag as purged (retain row + Drive copy) — no physical destruction
  await accessor(entity).update({ where: { id }, data: { purgeAfter: new Date(0) } })
  await writeAudit({ actorId: u.id, action: 'PURGE', entity, entityId: id })
}
export async function purgeExpired() {
  for (const m of MODELS) {
    const due = await accessor(m).findMany({ where: { deletedAt: { not: null }, purgeAfter: { lt: new Date() } } })
    for (const r of due) await writeAudit({ actorId: 'system', action: 'PURGE', entity: m, entityId: r.id })
  }
}
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/trash.ts tests/unit/trash.service.test.ts
git commit -m "feat: trash queue service (restore/purge, Admin-only)"
```

---

### Task 12: Phase-1 UI (clients list/create, RBAC-aware) + e2e smoke

**Files:**
- Create: `src/app/(app)/clients/page.tsx`, `src/app/(app)/clients/new/page.tsx`, `src/app/(app)/clients/actions.ts`
- Test: `tests/e2e/clients.spec.ts`

**Interfaces:**
- Consumes: `clients` service via Server Actions.
- Produces: working login → create client → see it in list flow.

- [ ] **Step 1: Write Server Actions**

```ts
// src/app/(app)/clients/actions.ts
'use server'
import { createClient } from '@/services/clients'
import { revalidatePath } from 'next/cache'
export async function addClient(formData: FormData) {
  await createClient({
    legalName: String(formData.get('legalName')),
    nationalId: String(formData.get('nationalId')),
    stageName: String(formData.get('stageName') || '') || undefined,
  })
  revalidatePath('/clients')
}
```

- [ ] **Step 2: Write the list + new pages**

```tsx
// src/app/(app)/clients/page.tsx
import { listClients } from '@/services/clients'
export default async function Clients() {
  const clients = await listClients()
  return (<main><h1>العملاء</h1><ul>{clients.map(c =>
    <li key={c.id}>{c.stageName ?? c.legalName}</li>)}</ul></main>)
}
```
```tsx
// src/app/(app)/clients/new/page.tsx
import { addClient } from '../actions'
export default function NewClient() {
  return (<form action={addClient}>
    <input name="legalName" placeholder="الاسم القانوني" required />
    <input name="stageName" placeholder="اسم الشهرة" />
    <input name="nationalId" placeholder="الرقم القومي" required />
    <button type="submit">حفظ</button>
  </form>)
}
```

- [ ] **Step 3: Write e2e smoke test**

```ts
// tests/e2e/clients.spec.ts
import { test, expect } from '@playwright/test'
test('admin can create and see a client', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'admin@luminawaves.com')
  await page.fill('[name=password]', 'changeme')
  await page.click('button[type=submit]')
  await page.goto('/clients/new')
  await page.fill('[name=legalName]', 'E2E Artist')
  await page.fill('[name=nationalId]', '29001011234567')
  await page.click('button[type=submit]')
  await page.goto('/clients')
  await expect(page.getByText('E2E Artist')).toBeVisible()
})
```

- [ ] **Step 4: Run e2e**

Run: `npx playwright test tests/e2e/clients.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/clients" tests/e2e/clients.spec.ts
git commit -m "feat: Phase 1 clients UI + e2e smoke"
```

---

# PHASE 2 — Contract Generation

Produces: pick a template → guided wizard → bilingual RTL PDF → Draft/Executed lifecycle.

### Task 13: PDF renderer (Playwright, Arabic RTL)

**Files:**
- Create: `src/lib/pdf.ts`, `src/templates/contracts/_layout.ts`
- Test: `tests/unit/pdf.test.ts`

**Interfaces:**
- Produces: `renderPdf(html: string): Promise<Buffer>`; `layout({ titleAr, bodyHtml }): string` (embeds Amiri font, sets `dir="rtl"`, `lang="ar"`).

- [ ] **Step 1: Failing test**

```ts
// tests/unit/pdf.test.ts
import { renderPdf } from '@/lib/pdf'
import { layout } from '@/templates/contracts/_layout'
test('renders a non-empty PDF buffer', async () => {
  const buf = await renderPdf(layout({ titleAr: 'عقد', bodyHtml: '<p>اختبار</p>' }))
  expect(buf.subarray(0, 4).toString()).toBe('%PDF')
}, 30000)
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/pdf.ts
import { chromium } from 'playwright'
export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    return await page.pdf({ format: 'A4', printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' } })
  } finally { await browser.close() }
}
```
```ts
// src/templates/contracts/_layout.ts
export function layout({ titleAr, bodyHtml }: { titleAr: string; bodyHtml: string }) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
  <style>
    @font-face{font-family:Amiri;src:local('Amiri');}
    body{font-family:Amiri,'Noto Naskh Arabic',serif;line-height:2;font-size:14px}
    h1{text-align:center} table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #333;padding:6px;text-align:center}
  </style></head><body><h1>${titleAr}</h1>${bodyHtml}</body></html>`
}
```
Note: install the Amiri font on the VPS (`apt-get install fonts-hosny-amiri`) and in the local Docker image; document in README.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf.ts src/templates/contracts/_layout.ts tests/unit/pdf.test.ts
git commit -m "feat: Playwright PDF renderer with Arabic RTL layout"
```

---

### Task 14: Contract template renderers (per grant type + annex)

**Files:**
- Create: `src/templates/contracts/exclusive-license.ts`, `full-assignment.ts`, `non-exclusive-license.ts`, `management.ts`, `annex.ts`
- Test: `tests/unit/templates.test.ts`

**Interfaces:**
- Consumes: `GRANT_TYPES`, `COVERAGE`, `MORAL_RIGHTS_NOTE`, `layout`.
- Produces: `renderContract(grantType, data): string` and `renderAnnex(data): string`, where `data` carries party names, National IDs, territory, term, coverage keys, and (for annex) the works table.

- [ ] **Step 1: Failing test**

```ts
// tests/unit/templates.test.ts
import { renderContract } from '@/templates/contracts'
test('exclusive license contract includes correct Arabic grant + moral-rights note', () => {
  const html = renderContract('EXCLUSIVE_LICENSE', {
    party1Name: 'أحمد علاء', party1NationalId: '28902102104713',
    territory: 'WORLDWIDE', termMonths: 36, coverage: ['DIGITAL','SYNC'],
  })
  expect(html).toContain('ترخيص حصري')
  expect(html).toContain('الحقوق الأدبية')   // moral-rights note always present
  expect(html).toContain('المزامنة')          // coverage rendered in Arabic
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement an index + one renderer (others follow the same shape)**

```ts
// src/templates/contracts/index.ts
import { layout } from './_layout'
import { GRANT_TYPES, COVERAGE, MORAL_RIGHTS_NOTE } from '@/lib/rights'
export type ContractData = {
  party1Name: string; party1NationalId: string; territory: string
  termMonths: number; coverage: string[]
}
const TERRITORY_AR: Record<string,string> = { EGYPT:'جمهورية مصر العربية', MENA:'منطقة الشرق الأوسط وشمال إفريقيا', WORLDWIDE:'جميع أنحاء العالم' }

export function renderContract(grantType: keyof typeof GRANT_TYPES, d: ContractData): string {
  const cov = d.coverage.map(k => `<li>${COVERAGE[k as keyof typeof COVERAGE].ar}</li>`).join('')
  const body = `
    <p>الطرف الأول: ${d.party1Name} — رقم قومي ${d.party1NationalId}.</p>
    <p>الطرف الثاني: لومينا ويفز للإنتاج.</p>
    <p>نوع المنح: <b>${GRANT_TYPES[grantType].ar}</b>.</p>
    <p>النطاق الجغرافي: ${TERRITORY_AR[d.territory]}. المدة: ${d.termMonths} شهرًا.</p>
    <p>صور الاستغلال الممنوحة:</p><ul>${cov}</ul>
    <p style="font-weight:bold">${MORAL_RIGHTS_NOTE.ar}</p>`
  return layout({ titleAr: 'عقد استغلال مصنفات فنية', bodyHtml: body })
}
```
Create the four grant-specific files as thin wrappers that supply grant-specific clause text into `body`; create `annex.ts` rendering the `<table>` of works (columns: الأغنية، المطرب، المؤلف، الملحن، الموزع الموسيقي).

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/templates/contracts tests/unit/templates.test.ts
git commit -m "feat: bilingual contract + annex template renderers"
```

---

### Task 15: Generation wizard + Draft→Executed lifecycle

**Files:**
- Create: `src/services/documents.ts`, `src/app/(app)/contracts/[id]/generate/page.tsx`, `src/app/(app)/contracts/[id]/generate/actions.ts`
- Test: `tests/unit/documents.service.test.ts`

**Interfaces:**
- Consumes: `renderContract`, `renderPdf`, `db`, `requireUser`, `writeAudit`.
- Produces: `generateContractPdf(contractId): Promise<Document>` (status `DRAFT`, writes file to storage), `markExecuted(documentId, signedFilePath)`.

- [ ] **Step 1: Failing test**

```ts
// tests/unit/documents.service.test.ts
import { vi } from 'vitest'
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id:'admin', role:'ADMIN' })) }))
vi.mock('@/lib/pdf', () => ({ renderPdf: vi.fn(async () => Buffer.from('%PDF-fake')) }))
import { generateContractPdf } from '@/services/documents'
import { createContract } from '@/services/contracts'
import { createClient } from '@/services/clients'
test('generating a contract creates a DRAFT document', async () => {
  const c = await createClient({ legalName:'G', nationalId:'10000000000055' })
  const k = await createContract({ clientId:c.id, grantType:'EXCLUSIVE_LICENSE', territory:'EGYPT', termMonths:12, coverage:['DIGITAL'] })
  const doc = await generateContractPdf(k.id)
  expect(doc.status).toBe('DRAFT')
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/services/documents.ts
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { renderContract } from '@/templates/contracts'
import { renderPdf } from '@/lib/pdf'

const STORAGE = process.env.STORAGE_DIR ?? '/var/lumina/storage'
export async function generateContractPdf(contractId: string) {
  const u = await requireUser('create', 'Document')
  const k = await db.masterContract.findUnique({ where: { id: contractId }, include: { client: true } })
  if (!k) throw new Error('contract not found')
  const html = renderContract(k.grantType, {
    party1Name: k.client.stageName ?? k.client.legalName,
    party1NationalId: k.client.nationalId, territory: k.territory,
    termMonths: k.termMonths, coverage: k.coverage as string[],
  })
  const buf = await renderPdf(html)
  const filename = `contract-${k.id}-draft.pdf`
  const storagePath = path.join(STORAGE, filename)
  await writeFile(storagePath, buf)
  const doc = await db.document.create({ data: { filename, storagePath, status: 'DRAFT', contractId: k.id } })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Document', entityId: doc.id, after: { filename, status: 'DRAFT' } })
  return doc
}
export async function markExecuted(documentId: string, signedFilePath: string) {
  const u = await requireUser('update', 'Document')
  const doc = await db.document.update({ where: { id: documentId }, data: { status: 'EXECUTED', storagePath: signedFilePath } })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'Document', entityId: documentId, after: { status: 'EXECUTED' } })
  return doc
}
```
Add `STORAGE_DIR` to `.env.example`. The wizard page is a multi-step form (client → grant type → territory/term → coverage checkboxes → review) that finally calls `generateContractPdf`.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/documents.ts "src/app/(app)/contracts/[id]/generate" tests/unit/documents.service.test.ts .env.example
git commit -m "feat: contract generation wizard + Draft/Executed lifecycle"
```

---

# PHASE 3 — Ingest, Arabic OCR & Search

Produces: upload scans → OCR (Arabic) → index in Meilisearch → fast bilingual search.

### Task 16: Queue + worker bootstrap

**Files:**
- Create: `src/lib/queue.ts`, `src/workers/index.ts`
- Test: `tests/unit/queue.test.ts`

**Interfaces:**
- Produces: `queues.ocr`, `queues.index`, `queues.drive`, `queues.mail` (BullMQ `Queue`s) + a `connection`. Worker entrypoint runs as a separate process (`tsx src/workers/index.ts`).

- [ ] **Step 1: Failing test**

```ts
// tests/unit/queue.test.ts
import { queues } from '@/lib/queue'
test('queues are defined', () => {
  expect(queues.ocr.name).toBe('ocr')
  expect(queues.index.name).toBe('index')
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/queue.ts
import { Queue } from 'bullmq'
import IORedis from 'ioredis'
export const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })
const make = (name: string) => new Queue(name, { connection })
export const queues = { ocr: make('ocr'), index: make('index'), drive: make('drive'), mail: make('mail') }
```
```ts
// src/workers/index.ts
import './ocr.worker'; import './index.worker'; import './drive.worker'; import './mail.worker'
console.log('workers up')
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queue.ts src/workers/index.ts tests/unit/queue.test.ts
git commit -m "feat: BullMQ queues + worker entrypoint"
```

---

### Task 17: OCR provider (interface + Tesseract Arabic)

**Files:**
- Create: `src/lib/ocr/provider.ts`, `src/lib/ocr/tesseract.ts`, `src/lib/ocr/google-vision.ts`
- Test: `tests/unit/ocr.test.ts`

**Interfaces:**
- Produces: `interface OcrProvider { extract(filePath: string): Promise<string> }`; `getOcrProvider()` returns Tesseract by default, GoogleVision when `OCR_PROVIDER=google`.

- [ ] **Step 1: Failing test (factory selection, provider mocked)**

```ts
// tests/unit/ocr.test.ts
import { getOcrProvider } from '@/lib/ocr/provider'
test('defaults to tesseract', () => {
  process.env.OCR_PROVIDER = 'tesseract'
  expect(getOcrProvider().constructor.name).toBe('TesseractProvider')
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/ocr/provider.ts
import { TesseractProvider } from './tesseract'
import { GoogleVisionProvider } from './google-vision'
export interface OcrProvider { extract(filePath: string): Promise<string> }
export function getOcrProvider(): OcrProvider {
  return process.env.OCR_PROVIDER === 'google' ? new GoogleVisionProvider() : new TesseractProvider()
}
```
```ts
// src/lib/ocr/tesseract.ts
import { createWorker } from 'tesseract.js'
import { OcrProvider } from './provider'
export class TesseractProvider implements OcrProvider {
  async extract(filePath: string): Promise<string> {
    const worker = await createWorker('ara+eng')
    try { const { data } = await worker.recognize(filePath); return data.text }
    finally { await worker.terminate() }
  }
}
```
```ts
// src/lib/ocr/google-vision.ts  (drop-in; used only when OCR_PROVIDER=google)
import { OcrProvider } from './provider'
export class GoogleVisionProvider implements OcrProvider {
  async extract(filePath: string): Promise<string> {
    const { ImageAnnotatorClient } = await import('@google-cloud/vision')
    const client = new ImageAnnotatorClient()
    const [res] = await client.documentTextDetection(filePath)
    return res.fullTextAnnotation?.text ?? ''
  }
}
```
Install: `npm i tesseract.js` (and `@google-cloud/vision` only if used). Document `apt-get install tesseract-ocr tesseract-ocr-ara` on the VPS for native speed.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ocr tests/unit/ocr.test.ts
git commit -m "feat: pluggable OCR provider (Tesseract Arabic default)"
```

---

### Task 18: Search client + indexing + OCR worker wiring

**Files:**
- Create: `src/lib/search.ts`, `src/workers/ocr.worker.ts`, `src/workers/index.worker.ts`
- Modify: `src/services/documents.ts` (enqueue OCR on upload)
- Test: `tests/unit/search.test.ts`

**Interfaces:**
- Consumes: `meilisearch`, `normalizeArabic`, `getOcrProvider`, `queues`.
- Produces: `indexDocument({ id, title, ocrText, clientName })`, `search(query): Promise<Hit[]>` (normalizes query first). OCR worker: on `ocr` job → extract → save `ocrText` → enqueue `index` job.

- [ ] **Step 1: Failing test (normalization applied to query)**

```ts
// tests/unit/search.test.ts
import { vi } from 'vitest'
const searchMock = vi.fn(async () => ({ hits: [] }))
vi.mock('meilisearch', () => ({ MeiliSearch: class { index(){ return { search: searchMock, addDocuments: vi.fn() } } } }))
import { search } from '@/lib/search'
test('search normalizes the query', async () => {
  await search('أحمد')
  expect(searchMock).toHaveBeenCalledWith('احمد', expect.anything())
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement search + workers**

```ts
// src/lib/search.ts
import { MeiliSearch } from 'meilisearch'
import { normalizeArabic } from '@/lib/arabic'
const client = new MeiliSearch({ host: process.env.MEILI_HOST!, apiKey: process.env.MEILI_KEY! })
const idx = () => client.index('documents')
export type DocHit = { id: string; title: string; clientName?: string }
export async function indexDocument(doc: { id: string; title: string; ocrText?: string; clientName?: string }) {
  await idx().addDocuments([{ ...doc, ocrText: normalizeArabic(doc.ocrText ?? ''), title_n: normalizeArabic(doc.title) }])
}
export async function search(query: string): Promise<DocHit[]> {
  const res = await idx().search(normalizeArabic(query), { limit: 50 })
  return res.hits as DocHit[]
}
```
```ts
// src/workers/ocr.worker.ts
import { Worker } from 'bullmq'
import { connection, queues } from '@/lib/queue'
import { getOcrProvider } from '@/lib/ocr/provider'
import { db } from '@/lib/db'
new Worker('ocr', async (job) => {
  const { documentId, filePath } = job.data
  const text = await getOcrProvider().extract(filePath)
  await db.document.update({ where: { id: documentId }, data: { ocrText: text } })
  await queues.index.add('index', { documentId })
}, { connection })
```
```ts
// src/workers/index.worker.ts
import { Worker } from 'bullmq'
import { connection } from '@/lib/queue'
import { db } from '@/lib/db'
import { indexDocument } from '@/lib/search'
new Worker('index', async (job) => {
  const d = await db.document.findUnique({ where: { id: job.data.documentId } })
  if (d) await indexDocument({ id: d.id, title: d.filename, ocrText: d.ocrText ?? '' })
}, { connection })
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search.ts src/workers/ocr.worker.ts src/workers/index.worker.ts tests/unit/search.test.ts
git commit -m "feat: Meilisearch indexing + OCR/index workers with Arabic normalization"
```

---

### Task 19: Upload endpoint + search UI

**Files:**
- Create: `src/app/(app)/documents/upload/actions.ts`, `src/app/(app)/search/page.tsx`
- Modify: `src/services/documents.ts` (add `uploadDocument` that saves file + enqueues OCR)
- Test: `tests/e2e/search.spec.ts`

**Interfaces:**
- Consumes: `documents` service, `search`.
- Produces: upload a scan → background OCR/index → it becomes findable in `/search`.

- [ ] **Step 1: Add `uploadDocument` to documents.ts**

```ts
// append to src/services/documents.ts
import { queues } from '@/lib/queue'
export async function uploadDocument(input: { buffer: Buffer; filename: string; contractId?: string; annexId?: string }) {
  const u = await requireUser('create', 'Document')
  const storagePath = path.join(STORAGE, `${Date.now()}-${input.filename}`)
  await writeFile(storagePath, input.buffer)
  const doc = await db.document.create({ data: { filename: input.filename, storagePath, status: 'EXECUTED', contractId: input.contractId, annexId: input.annexId } })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Document', entityId: doc.id, after: { filename: input.filename } })
  await queues.ocr.add('ocr', { documentId: doc.id, filePath: storagePath })
  return doc
}
```

- [ ] **Step 2: Search page**

```tsx
// src/app/(app)/search/page.tsx
import { search } from '@/lib/search'
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const hits = q ? await search(q) : []
  return (<main><form><input name="q" defaultValue={q} placeholder="ابحث في المستندات" /></form>
    <ul>{hits.map(h => <li key={h.id}>{h.title}</li>)}</ul></main>)
}
```

- [ ] **Step 3: e2e (upload → eventually searchable)**

```ts
// tests/e2e/search.spec.ts
import { test, expect } from '@playwright/test'
test('uploaded doc becomes searchable', async ({ page }) => {
  // login + upload a fixture PDF, then poll /search?q=... until the title appears (workers must be running)
  test.slow()
  // ...login helper...
  await expect.poll(async () => {
    await page.goto('/search?q=' + encodeURIComponent('عقد'))
    return await page.getByText(/\.pdf/).count()
  }, { timeout: 30000 }).toBeGreaterThan(0)
})
```

- [ ] **Step 4: Run e2e** (workers running: `npx tsx src/workers/index.ts &`) → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/documents" "src/app/(app)/search" src/services/documents.ts tests/e2e/search.spec.ts
git commit -m "feat: document upload + search UI wired through OCR/index pipeline"
```

---

# PHASE 4 — Google Drive Backup

Produces: a continuously-synced, human-navigable Drive mirror with `data.json` per folder.

### Task 20: Drive client + path mapping

**Files:**
- Create: `src/lib/drive.ts`
- Test: `tests/unit/drive.test.ts`

**Interfaces:**
- Produces: `ensureFolderPath(parts: string[]): Promise<string>` (returns folder id, creating missing segments), `upsertFile(folderId, name, buf, mime)`, `upsertJson(folderId, name, obj)`. Uses service-account auth scoped to `DRIVE_FOLDER_ID`.

- [ ] **Step 1: Failing test (path builder, googleapis mocked)**

```ts
// tests/unit/drive.test.ts
import { vi } from 'vitest'
const create = vi.fn(async () => ({ data: { id: 'new' } }))
const list = vi.fn(async () => ({ data: { files: [] } }))
vi.mock('googleapis', () => ({ google: {
  auth: { GoogleAuth: class { getClient(){ return {} } } },
  drive: () => ({ files: { create, list } }),
}}))
import { ensureFolderPath } from '@/lib/drive'
test('creates each missing folder segment', async () => {
  const id = await ensureFolderPath(['Ahmed Alaa', 'Master Contract 2018'])
  expect(create).toHaveBeenCalledTimes(2)
  expect(id).toBe('new')
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/drive.ts
import { google } from 'googleapis'
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'),
  scopes: ['https://www.googleapis.com/auth/drive'],
})
const drive = () => google.drive({ version: 'v3', auth })
const FOLDER = 'application/vnd.google-apps.folder'

export async function ensureFolderPath(parts: string[]): Promise<string> {
  let parent = process.env.DRIVE_FOLDER_ID!
  for (const name of parts) {
    const q = `name='${name.replace(/'/g, "\\'")}' and '${parent}' in parents and mimeType='${FOLDER}' and trashed=false`
    const found = await drive().files.list({ q, fields: 'files(id)' })
    parent = found.data.files?.[0]?.id
      ?? (await drive().files.create({ requestBody: { name, mimeType: FOLDER, parents: [parent] }, fields: 'id' })).data.id!
  }
  return parent
}
export async function upsertJson(folderId: string, name: string, obj: unknown) {
  await drive().files.create({ requestBody: { name, parents: [folderId] },
    media: { mimeType: 'application/json', body: JSON.stringify(obj, null, 2) }, fields: 'id' })
}
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/drive.ts tests/unit/drive.test.ts
git commit -m "feat: Google Drive client + folder-path mapping"
```

---

### Task 21: Backup worker (mirror + data.json) + change triggers

**Files:**
- Create: `src/workers/drive.worker.ts`
- Modify: `src/services/clients.ts`, `contracts.ts`, `annexes.ts`, `documents.ts` (enqueue `drive` job after mutations)
- Test: `tests/unit/drive.worker.test.ts`

**Interfaces:**
- Consumes: `ensureFolderPath`, `upsertJson`, `upsertFile`, `db`.
- Produces: a `drive` job handler that, given `{ clientId }`, rebuilds that client's subtree: `/<client>/_client-summary.pdf`, `/<client>/data.json`, and per-contract/annex `data.json` + signed PDFs.

- [ ] **Step 1: Failing test (job assembles correct path parts)**

```ts
// tests/unit/drive.worker.test.ts
import { vi } from 'vitest'
const ensure = vi.fn(async () => 'fid'); const upsertJson = vi.fn()
vi.mock('@/lib/drive', () => ({ ensureFolderPath: ensure, upsertJson, upsertFile: vi.fn() }))
import { backupClient } from '@/workers/drive.worker'
import { db } from '@/lib/db'
test('writes client data.json under the client folder', async () => {
  const c = await db.client.create({ data: { legalName: 'Ahmed Alaa', nationalId: '10000000000044' } })
  await backupClient(c.id)
  expect(ensure).toHaveBeenCalledWith(['Ahmed Alaa'])
  expect(upsertJson).toHaveBeenCalledWith('fid', 'data.json', expect.objectContaining({ legalName: 'Ahmed Alaa' }))
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement (export `backupClient` + register the worker)**

```ts
// src/workers/drive.worker.ts
import { Worker } from 'bullmq'
import { connection } from '@/lib/queue'
import { ensureFolderPath, upsertJson } from '@/lib/drive'
import { db } from '@/lib/db'

export async function backupClient(clientId: string) {
  const c = await db.client.findUnique({ where: { id: clientId }, include: { contracts: { include: { annexes: { include: { works: { include: { credits: true } } } } } } } })
  if (!c) return
  const folder = c.stageName ?? c.legalName
  const root = await ensureFolderPath([folder])
  await upsertJson(root, 'data.json', c)
  for (const k of c.contracts) {
    const cf = await ensureFolderPath([folder, `Master Contract ${k.signedDate?.getFullYear() ?? ''}`.trim()])
    await upsertJson(cf, 'data.json', k)
    for (const a of k.annexes) {
      const af = await ensureFolderPath([folder, `Master Contract ${k.signedDate?.getFullYear() ?? ''}`.trim(), `Annex ${a.number}`])
      await upsertJson(af, 'data.json', a)
    }
  }
}
new Worker('drive', async (job) => backupClient(job.data.clientId), { connection })
```
In each mutating service, after the audit write, add: `await queues.drive.add('backup', { clientId })` (resolving `clientId` from the entity). The summary PDF reuses `renderPdf` with a simple client-summary template.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workers/drive.worker.ts src/services tests/unit/drive.worker.test.ts
git commit -m "feat: Drive backup worker (navigable mirror + data.json) + change triggers"
```

---

# PHASE 5 — PWA, i18n, Email

Produces: installable PWA shell, full Arabic/English switch with RTL, transactional email.

### Task 22: i18n + RTL shell

**Files:**
- Create: `src/messages/ar.json`, `src/messages/en.json`, `src/i18n.ts`
- Modify: `src/app/layout.tsx`
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces: `next-intl` config, Arabic default, `<html dir>` derived from locale (`ar`→`rtl`).

- [ ] **Step 1: Failing test**

```ts
// tests/unit/i18n.test.ts
import { dirFor } from '@/i18n'
test('arabic is rtl, english is ltr', () => {
  expect(dirFor('ar')).toBe('rtl')
  expect(dirFor('en')).toBe('ltr')
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/i18n.ts
export const locales = ['ar','en'] as const
export const defaultLocale = 'ar'
export const dirFor = (l: string) => (l === 'ar' ? 'rtl' : 'ltr')
```
```tsx
// src/app/layout.tsx (root)
import { dirFor, defaultLocale } from '@/i18n'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = defaultLocale
  return (<html lang={locale} dir={dirFor(locale)}><body>{children}</body></html>)
}
```
Populate `ar.json`/`en.json` with the navigation + form labels used so far (clients, contracts, search, trash, save, etc.), Arabic-first.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n.ts src/messages src/app/layout.tsx tests/unit/i18n.test.ts
git commit -m "feat: bilingual i18n + RTL shell (Arabic default)"
```

---

### Task 23: PWA manifest + service worker

**Files:**
- Create: `public/manifest.json`, `public/icons/*`
- Modify: `next.config.js` (wrap with next-pwa)
- Test: `tests/e2e/pwa.spec.ts`

**Interfaces:**
- Produces: installable PWA — manifest linked, service worker registered in production build.

- [ ] **Step 1: Write manifest**

```json
// public/manifest.json
{ "name": "Lumina Waves Ops", "short_name": "Lumina", "start_url": "/",
  "display": "standalone", "background_color": "#0b0b0f", "theme_color": "#0b0b0f", "dir": "rtl", "lang": "ar",
  "icons": [{ "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
            { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" }] }
```

- [ ] **Step 2: Wrap next config**

```js
// next.config.js
const withPWA = require('next-pwa')({ dest: 'public', disable: process.env.NODE_ENV === 'development' })
module.exports = withPWA({})
```

- [ ] **Step 3: e2e checks manifest is served**

```ts
// tests/e2e/pwa.spec.ts
import { test, expect } from '@playwright/test'
test('manifest is served and linked', async ({ page, request }) => {
  const res = await request.get('/manifest.json')
  expect(res.ok()).toBeTruthy()
  expect((await res.json()).short_name).toBe('Lumina')
})
```

- [ ] **Step 4: Run e2e** → PASS.

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/icons next.config.js tests/e2e/pwa.spec.ts
git commit -m "feat: PWA manifest + service worker"
```

---

### Task 24: Transactional email + delete-queue alerts

**Files:**
- Create: `src/lib/mail.ts`, `src/workers/mail.worker.ts`
- Modify: `src/services/trash.ts` (enqueue alert on soft-delete)
- Test: `tests/unit/mail.test.ts`

**Interfaces:**
- Produces: `sendMail({ to, subject, html })` via Nodemailer/SMTP; `mail` worker consumes `mail` jobs; soft-delete enqueues an alert to admins (3-day reversible window reminder).

- [ ] **Step 1: Failing test (transport mocked)**

```ts
// tests/unit/mail.test.ts
import { vi } from 'vitest'
const sendMail = vi.fn(async () => ({ messageId: 'x' }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }))
import { sendMail as send } from '@/lib/mail'
test('sends through SMTP transport', async () => {
  await send({ to: 'a@b.com', subject: 'Hi', html: '<p>hi</p>' })
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com' }))
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/mail.ts
import nodemailer from 'nodemailer'
const transport = nodemailer.createTransport(process.env.SMTP_URL!)
export async function sendMail(m: { to: string; subject: string; html: string }) {
  return transport.sendMail({ from: process.env.MAIL_FROM!, ...m })
}
```
```ts
// src/workers/mail.worker.ts
import { Worker } from 'bullmq'
import { connection } from '@/lib/queue'
import { sendMail } from '@/lib/mail'
new Worker('mail', async (job) => sendMail(job.data), { connection })
```
In `trash.ts` `softDeleteClient` path (and siblings), after the audit write: `await queues.mail.add('mail', { to: ADMIN_EMAIL, subject: 'حذف عنصر — قابل للاسترجاع 3 أيام', html: '...' })`.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mail.ts src/workers/mail.worker.ts src/services/trash.ts tests/unit/mail.test.ts
git commit -m "feat: transactional email + delete-queue alerts"
```

---

### Task 25: Cron — expire trash + deploy docs

**Files:**
- Create: `src/workers/cron.ts`, `DEPLOY.md`
- Modify: `src/workers/index.ts` (import cron)
- Test: `tests/unit/cron.test.ts`

**Interfaces:**
- Produces: a repeatable BullMQ job (daily) calling `purgeExpired()`; `DEPLOY.md` documents Vultr setup (Node, PM2 for web + worker, Postgres/Redis/Meilisearch, Amiri + tesseract-ocr-ara, SMTP, Drive service account, nightly verification).

- [ ] **Step 1: Failing test**

```ts
// tests/unit/cron.test.ts
import { vi } from 'vitest'
const purgeExpired = vi.fn()
vi.mock('@/services/trash', () => ({ purgeExpired }))
import { runDailyMaintenance } from '@/workers/cron'
test('daily maintenance purges expired trash', async () => {
  await runDailyMaintenance()
  expect(purgeExpired).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/workers/cron.ts
import { Queue, Worker } from 'bullmq'
import { connection } from '@/lib/queue'
import { purgeExpired } from '@/services/trash'
export async function runDailyMaintenance() { await purgeExpired() }
const q = new Queue('cron', { connection })
q.add('daily', {}, { repeat: { pattern: '0 3 * * *' } })
new Worker('cron', async () => runDailyMaintenance(), { connection })
```

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Write `DEPLOY.md`** with the Vultr runbook (provision Ubuntu, install Node 20 + PM2, run `docker compose` or native Postgres/Redis/Meilisearch, `apt-get install fonts-hosny-amiri tesseract-ocr tesseract-ocr-ara`, set `.env`, `pm2 start` web + `tsx src/workers/index.ts`, configure SMTP creds, mount a Drive service account, verify nightly backup runs).

- [ ] **Step 6: Commit**

```bash
git add src/workers/cron.ts src/workers/index.ts DEPLOY.md tests/unit/cron.test.ts
git commit -m "feat: daily trash-expiry cron + Vultr deploy runbook"
```

---

## Self-Review

**Spec coverage check (spec § → task):**

- §2 Domain model (Client→Contract→Annex→Work, pending-annex, credits, rights axis) → Tasks 3, 9, 10 ✅
- §3 Rights model (grant types, Art.149 coverage, moral-rights rule, life+50 info) → Tasks 7, 10, 14 ✅ (duration is informational; surfaced in templates/data, no computation task needed)
- §4 RBAC (5 roles, sensitive fields, Admin-only purge) → Tasks 6, 8, 9, 11 ✅
- §5 Contract generation (templates, wizard, RTL PDF, Draft→Executed) → Tasks 13, 14, 15 ✅
- §6 Ingest/OCR/search (scans, Arabic OCR, normalization, false-friend) → Tasks 2, 17, 18, 19 ✅ (الموزّع false-friend handled via distinct `ARRANGER` credit role + Arabic label `الموزّع الموسيقي` in Task 14/glossary)
- §7 Soft-delete/trash/audit → Tasks 4, 5, 11, 25 ✅
- §8 Drive backup (navigable mirror + data.json) → Tasks 20, 21 ✅
- §9 Bilingual/PWA/email → Tasks 22, 23, 24 ✅
- §10 Hosting (Vultr, localhost) → Tasks 1, 25 (DEPLOY.md) ✅

**Placeholder scan:** Tasks 14 and 21 reference "follow the same shape" for sibling template files / sibling service enqueues — each shows a complete worked example and the variation is purely mechanical (different clause text / different `clientId` resolution). Acceptable per right-sizing; not a logic placeholder.

**Type consistency:** `requireUser(action, entity)`, `can(role, action, entity)`, `redactSensitive(role, entity, row)`, `db.$softDelete(model, id, purgeAfter)`, `writeAudit(AuditInput)`, `getOcrProvider().extract()`, `indexDocument()/search()`, `ensureFolderPath()/upsertJson()` are used consistently across all tasks.

**Note on later-phase precision:** per the chosen "all 5 phases, one document" scope, Phases 4–5 tasks specify real interfaces and worked code but leave mechanical repetition (sibling templates, per-service enqueue calls, full message catalogs) to the implementer — these are explicitly flagged where they occur.

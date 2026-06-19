# Task 1 — Project scaffold + local infra (EXTENDED: Tailwind v4 + Framer Motion)

You are implementing the foundation of the **Lumina Waves Operations System** — a bilingual
(Arabic-first, RTL) mobile-first PWA. This is Task 1 of a 25-task plan. Your job: scaffold a
Next.js 15 app and stand up local infra so every later task has a known-good base.

## Working directory
- Repo root: `/Users/mahmoudamr/Work/UW/Amr Morsy - Luminia Wave` (already a git repo, branch `feat/phase-1-foundation`).
- The app must live in the **`lumina/`** subdirectory of the repo root. All app commands run from `lumina/`.
- Do NOT create a nested git repo. If `create-next-app` created `lumina/.git`, delete it (`rm -rf lumina/.git`).

## Steps

### Step 1: Scaffold the app (NOTE the deviation: WITH Tailwind, not --no-tailwind)
From the repo root run:
```bash
npx --yes create-next-app@latest lumina --typescript --app --eslint --src-dir --tailwind --turbopack --import-alias "@/*" --use-npm --yes
cd lumina
npm i prisma @prisma/client next-auth@beta bcryptjs bullmq ioredis meilisearch googleapis nodemailer next-intl framer-motion
npm i -D vitest @vitest/coverage-v8 tsx @types/bcryptjs @types/nodemailer playwright
npx --yes playwright install chromium
npx prisma init --datasource-provider postgresql
```
- `framer-motion` is an ADDED dependency (animations are a project requirement).
- Tailwind v4 ships with create-next-app@latest — verify `lumina/src/app/globals.css` contains `@import "tailwindcss";` and that `postcss.config.mjs` references `@tailwindcss/postcss`. If create-next-app produced a different but working Tailwind v4 setup, keep it.
- If `npx prisma init` complains that `.env`/`prisma` partly exist, that's fine — keep the generated `prisma/schema.prisma` and merge env vars in Step 3.

### Step 2: Write local infra compose file at `lumina/docker-compose.yml`
```yaml
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

### Step 3: Write `lumina/.env.example` AND a working `lumina/.env` (so later DB tasks run)
`.env.example` (committed) and `.env` (gitignored — confirm `.env` is in `lumina/.gitignore`; create-next-app/prisma usually add it) both contain:
```bash
DATABASE_URL="postgresql://lumina:lumina@localhost:5432/lumina"
REDIS_URL="redis://localhost:6379"
MEILI_HOST="http://localhost:7700"
MEILI_KEY="devkey"
AUTH_SECRET="dev-secret-change-me"
SMTP_URL="smtp://user:pass@host:587"
MAIL_FROM="ops@luminawaves.com"
DRIVE_FOLDER_ID=""
GOOGLE_SERVICE_ACCOUNT_JSON=""
OCR_PROVIDER="tesseract"
STORAGE_DIR="./.storage"
```

### Step 4: Configure Vitest at `lumina/vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'
export default defineConfig({
  test: { environment: 'node', globals: true, include: ['tests/unit/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```
Add npm scripts to `lumina/package.json`: `"test": "vitest run"`, `"test:unit": "vitest run tests/unit"`, `"worker": "tsx src/workers/index.ts"`. Create empty `lumina/tests/unit/` and `lumina/tests/e2e/` directories (add a `.gitkeep`).

### Step 5: Verify it boots
```bash
cd lumina
docker compose up -d
npm run build
docker compose ps
```
- Expected: build succeeds; `docker compose ps` shows db, redis, meili running. If a healthcheck column shows "starting", that's acceptable as long as the containers are Up. Capture the output of `docker compose ps` and the tail of `npm run build` into your report.
- If `npm run build` fails because the default `create-next-app` page imports something missing, fix minimally — do not redesign the page (the brand/design system is Task 1B).

### Step 6: Commit (from repo root or lumina/, the repo is the same)
```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app (Tailwind v4 + Framer Motion) + local infra"
```
Commits are GPG/SSH-signed automatically by the repo config — do not pass any `--no-gpg-sign`.

## Definition of done
- `lumina/` contains a building Next.js 15 + TS + Tailwind v4 app with the dependencies above installed.
- `docker compose up -d` brings up Postgres/Redis/Meilisearch.
- `.env.example` committed; `.env` present locally and gitignored.
- Vitest configured; `tests/unit` and `tests/e2e` dirs exist.
- One signed commit created.

## Out of scope (do NOT do these — later tasks)
- Any branding, logo, colors, design system, or page redesign (Task 1B).
- Prisma models, auth, services (Tasks 3+). Leave `prisma/schema.prisma` as the default generated stub.

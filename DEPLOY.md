# Lumina Waves — Vultr Deployment Runbook (Docker Compose)

One VPS runs the whole stack via Docker Compose: the **web app**, the
**background worker**, **Postgres**, **Redis**, **Meilisearch**, and **Caddy**
(automatic HTTPS). Files (PDFs, uploads, avatars) live on a persistent Docker
volume on the server's disk — **no S3 required**.

> Updating an existing deploy? Jump to [Updating](#updating).

---

## 1. Provision the server
- Vultr → **Cloud Compute**, **Ubuntu 24.04 LTS**, **2 GB RAM minimum**
  (4 GB is comfortable — Chromium PDF rendering + Meilisearch are the memory users).
- Firewall: allow **22 (SSH), 80, 443**.
- Note the public **IP**.

## 2. Point your domain (Namecheap)
- Namecheap → your domain → **Advanced DNS** → add an **A record**:
  Host `@`, Value `<server IP>`. (Optional: a second A record for `www`.)
- Wait for DNS to resolve; Caddy issues the TLS certificate automatically once it does.

## 3. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
```

## 4. (2 GB boxes) add swap so the build / Chromium / Meili don't OOM
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 5. Get the code
```bash
git clone <your-repo-url> /opt/lumina
cd /opt/lumina
```

## 6. Configure secrets
```bash
cp .env.production.example .env
openssl rand -base64 32          # use for AUTH_SECRET
nano .env
```
Fill in: `DOMAIN`, `POSTGRES_PASSWORD` (and the matching `DATABASE_URL`),
`AUTH_SECRET`, **`AUTH_TRUST_HOST=true`** (required behind the Caddy proxy —
Auth.js rejects the host otherwise), `SEED_ADMIN_*`, `MEILI_KEY`, and the
**real** VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` — generate with
`npx web-push generate-vapid-keys`). Optional: SMTP (transactional email) and
Google Drive backup.

**`www` subdomain:** the Caddyfile redirects `www.<domain>` → apex. For it to get
a cert, add an `A` record for `www` → the server IP (same as the apex), then
`docker compose restart caddy`.

**Email note:** Zoho Mail (free) gives you a human inbox (`ops@luminawaves.com`)
but **no external SMTP** on the free tier. For the app's transactional email set
`SMTP_URL` to a sending service — **Resend** (`smtps://resend:<API_KEY>@smtp.resend.com:465`)
or **ZeptoMail** (`smtps://emailapikey:<SEND_TOKEN>@smtp.zeptomail.com:465`). App
email is optional; the app runs fine with `SMTP_URL` blank. See `.env.production.example`.

## 7. Launch
The image is **built in CI and published to GHCR**, so the server just pulls it
(no building on the VPS):
```bash
docker compose pull        # pull the prebuilt ghcr.io/mahmoudamr512/lumina-waves image
docker compose up -d
```
The **web** service runs `prisma migrate deploy` automatically on boot.

> The GHCR image is public (the repo is public), so no registry login is needed.
> If you make the image private later, run `docker login ghcr.io` on the box first.

## 8. Create the first admin
```bash
docker compose exec web npx tsx prisma/seed.ts
```
Uses `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`. Log in and change the password.

## 9. Verify
- `https://<your-domain>` → valid TLS + login page.
- `docker compose ps` → all services `Up` (db `healthy`).
- `docker compose logs -f web worker` → no errors.
- Generate a contract PDF and post a comment to confirm storage + worker + push.

## 10. Backups (do before storing real contracts)
```bash
chmod +x scripts/backup.sh
crontab -e
# add:
0 3 * * * cd /opt/lumina && ./scripts/backup.sh >> /var/log/lumina-backup.log 2>&1
```
Backups (DB dump + file-storage tar, 14-day retention) land in
`/opt/lumina/backups`. For off-box safety, configure `rclone` to Cloudflare R2 /
Backblaze B2 and uncomment the `rclone copy` line in `scripts/backup.sh`. Vultr
automatic snapshots are a good whole-server safety net too.

---

## Updating
```bash
cd /opt/lumina && git pull --ff-only && docker compose pull && docker compose up -d
```
Migrations apply automatically on the web container's next boot. (CI rebuilds and
publishes the GHCR image on every green `main`; the server only pulls it.)

## Architecture notes
- **Web** (`next start`) and **worker** (`npm run worker` — OCR, Drive backup,
  mail, nightly trash-purge cron) run from the same image; both mount the shared
  `storage` volume so the worker can read uploaded files for OCR.
- **PDFs** render via Playwright Chromium (baked into the image) and are written
  to the `storage` volume; the download routes stream them back with RBAC checks.
- **Optional features** (SMTP email, Google Drive backup) degrade gracefully when
  their env vars are blank.
- **Scaling:** single-node by design. To run multiple web nodes later, move file
  storage to S3/R2 (the storage layer would need an adapter) and use managed
  Postgres/Redis/Meili.

---

## Continuous deploy (optional, one-push releases)

`.github/workflows/deploy.yml` SSHes into the VPS and runs
`git pull && docker compose pull && docker compose up -d` — but **only after CI
passes on `main`** (which is also where the image is published to GHCR), or when
triggered manually from the Actions tab. It safely **no-ops** until you set the
secrets below, so it won't fail before the server exists.

**One-time setup:**

1. On the VPS, create a deploy SSH key and authorize it:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/deploy -N ""
   cat ~/.ssh/deploy.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/deploy           # copy this PRIVATE key for the next step
   ```
2. In GitHub → repo **Settings → Secrets and variables → Actions**, add:
   - `DEPLOY_HOST` — server IP or hostname
   - `DEPLOY_USER` — the SSH user (e.g. `root` or your deploy user)
   - `DEPLOY_SSH_KEY` — the **private** key from step 1
   - `DEPLOY_PORT` — optional, defaults to `22`
3. Ensure the server has the repo at **`/opt/lumina`** with `.env` present (from
   the steps above). Deploys then run automatically on every green `main`, or via
   **Actions → Deploy → Run workflow**.

The remote command is a fixed string and all inputs come from secrets — no
untrusted data is interpolated into the workflow.

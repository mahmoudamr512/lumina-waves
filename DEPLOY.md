# Lumina Waves — Vultr Deployment Runbook

This document covers provisioning a production server on Vultr running Ubuntu 24.04 LTS.

---

## 1. Provision the Server

- **Plan:** Cloud Compute, Regular Performance — minimum 2 vCPU / 4 GB RAM
- **OS:** Ubuntu 24.04 LTS (x86_64)
- **Firewall:** open ports 22 (SSH), 80, 443

SSH in as root and create a deploy user:

```bash
adduser lumina
usermod -aG sudo lumina
su - lumina
```

---

## 2. Install System Dependencies

```bash
sudo apt-get update && sudo apt-get upgrade -y

# Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Process manager
sudo npm install -g pm2

# Arabic fonts + Tesseract OCR with Arabic language pack
sudo apt-get install -y fonts-hosny-amiri tesseract-ocr tesseract-ocr-ara

# Build tools (needed for native addons)
sudo apt-get install -y build-essential git
```

---

## 3. Infrastructure Services (Postgres, Redis, Meilisearch)

Use Docker Compose for simplicity. Install Docker first:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker lumina
# Re-login so group membership takes effect
```

Create `/home/lumina/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: lumina
      POSTGRES_USER: lumina
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"

  meilisearch:
    image: getmeili/meilisearch:v1.7
    restart: unless-stopped
    environment:
      MEILI_MASTER_KEY: ${MEILI_KEY}
    volumes:
      - meilidata:/meili_data
    ports:
      - "127.0.0.1:7700:7700"

volumes:
  pgdata:
  meilidata:
```

Start services:

```bash
cd /home/lumina
POSTGRES_PASSWORD=<strong-password> MEILI_KEY=<strong-key> docker compose up -d
```

---

## 4. Deploy the Application

```bash
cd /home/lumina
git clone https://github.com/<org>/lumina-waves.git app
cd app/lumina
npm ci
```

---

## 5. Configure Environment

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
nano .env
```

Required variables:

```dotenv
DATABASE_URL="postgresql://lumina:<postgres-password>@localhost:5432/lumina"
REDIS_URL="redis://localhost:6379"
MEILI_HOST="http://localhost:7700"
MEILI_KEY="<your-meili-master-key>"

AUTH_SECRET="<random-64-char-string>"          # openssl rand -hex 32

SEED_ADMIN_EMAIL="admin@luminawaves.com"
SEED_ADMIN_PASSWORD="<strong-password>"        # REQUIRED in production

STORAGE_DIR="/home/lumina/storage"

# --- Email (SMTP) ---
# Currently unconfigured. Fill in to enable transactional email and delete alerts.
# Any SMTP provider works (SendGrid, Mailgun, Postmark, etc.).
SMTP_URL="smtp://apikey:<sendgrid-api-key>@smtp.sendgrid.net:587"
MAIL_FROM="ops@luminawaves.com"
ALERT_EMAIL="admin@luminawaves.com"            # receives soft-delete notifications

# --- Google Drive backup (optional) ---
# Leave blank to disable. Fill in both to enable navigable Drive mirror.
DRIVE_FOLDER_ID=""
GOOGLE_SERVICE_ACCOUNT_JSON=""

OCR_PROVIDER="tesseract"
```

Create storage directory:

```bash
mkdir -p /home/lumina/storage
```

---

## 6. Run Migrations and Seed

```bash
cd /home/lumina/app/lumina
npx prisma migrate deploy
npx prisma db seed
```

The seed creates the initial admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

---

## 7. Build the Application

```bash
cd /home/lumina/app/lumina
npm run build
```

---

## 8. Start with PM2

```bash
cd /home/lumina/app/lumina

# Web app (Next.js)
pm2 start npm --name "lumina-web" -- start

# Background workers (BullMQ: OCR, Drive backup, mail, daily cron)
pm2 start --name "lumina-worker" -- npm run worker

pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

Verify both processes are running:

```bash
pm2 status
```

---

## 9. Verify Nightly Trash Expiry

The worker registers a BullMQ repeatable job (`cron` queue, `0 3 * * *` UTC) that calls
`purgeExpired()` each night, flagging rows past their 3-day recovery window.

Check the cron was registered:

```bash
# In a Node REPL or a one-off script
node -e "
const { Queue } = require('bullmq');
const q = new Queue('cron', { connection: { url: process.env.REDIS_URL } });
q.getRepeatableJobs().then(jobs => { console.log(jobs); process.exit(); });
"
```

You should see a job with `pattern: '0 3 * * *'`.

Check PM2 logs the next morning:

```bash
pm2 logs lumina-worker --lines 100 | grep purge
```

---

## 10. Verify Drive Backup (when configured)

After setting `DRIVE_FOLDER_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` and restarting
`lumina-worker`, create or update a client via the UI. Within seconds you should see
a folder appear in the configured Drive root.

Check worker logs:

```bash
pm2 logs lumina-worker --lines 50 | grep drive
```

---

## 11. Enable SMTP / Transactional Email

1. Obtain SMTP credentials from your provider (SendGrid, Postmark, etc.).
2. Set `SMTP_URL`, `MAIL_FROM`, and `ALERT_EMAIL` in `.env`.
3. Restart the web app: `pm2 restart lumina-web`
4. Soft-delete any entity via the UI — the admin address in `ALERT_EMAIL` should
   receive an Arabic notification email confirming the 3-day recovery window.

---

## 12. Currently Unconfigured (Optional) Features

| Feature | Variables Required | Status |
|---|---|---|
| SMTP / transactional email | `SMTP_URL`, `MAIL_FROM`, `ALERT_EMAIL` | Not configured — soft-delete works without it; email is best-effort |
| Google Drive backup | `DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Not configured — mutations succeed without it |

Both features degrade gracefully: the application logs a warning and continues rather than failing the mutation.

---

## 13. Reverse Proxy (Nginx + TLS)

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d luminawaves.com -d www.luminawaves.com
```

`/etc/nginx/sites-available/lumina`:

```nginx
server {
    server_name luminawaves.com www.luminawaves.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/lumina /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

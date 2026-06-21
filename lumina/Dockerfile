# Single image used for BOTH the web app (next start) and the worker (npm run
# worker). Kept "fat" on purpose: the worker runs TypeScript via tsx and the web
# app renders PDFs via Playwright Chromium, so we keep all deps + source + the
# built app in one reliable image. Run different commands per service in compose.
FROM node:22-bookworm

WORKDIR /app

# Install dependencies (incl. dev — needed for the build and for tsx at runtime).
COPY package.json package-lock.json ./
RUN npm ci

# App source + Prisma client + production build.
COPY . .
RUN npx prisma generate \
 && npm run build \
 && npx playwright install --with-deps chromium

ENV NODE_ENV=production
EXPOSE 3000

# Web service default; the worker service overrides this with `npm run worker`.
CMD ["npm", "run", "start"]

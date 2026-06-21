# Single image used for BOTH the web app (next start) and the worker (npm run
# worker). Kept "fat" on purpose: the worker runs TypeScript via tsx and the web
# app renders PDFs via Playwright Chromium, so we keep all deps + source + the
# built app in one reliable image. Run different commands per service in compose.
FROM node:22-bookworm

WORKDIR /app

# Copy the full source BEFORE install: the `postinstall` hook runs
# `prisma generate`, which needs prisma/schema.prisma + prisma.config.ts present.
# (node_modules/.next/.env are excluded via .dockerignore.)
COPY . .

# Install all deps (incl. dev — needed for the build and for tsx at runtime),
# build the app, and install Chromium for PDF rendering.
RUN npm ci \
 && npm run build \
 && npx playwright install --with-deps chromium

ENV NODE_ENV=production
EXPOSE 3000

# Web service default; the worker service overrides this with `npm run worker`.
CMD ["npm", "run", "start"]

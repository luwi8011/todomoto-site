# Self-hosted preview of the site: Node builds it, nginx serves the static files.
# Build settings come from docker-compose.yml (SITE_URL is the address the shop will visit).

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Dev dependencies (wrangler, type checker) aren't needed to build.
RUN npm ci --omit=dev
COPY . .
ARG SITE_URL=""
# Cloudflare's public always-pass test key; the preview form doesn't send email anyway.
ARG PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
ARG PREVIEW=true
ENV SITE_URL=$SITE_URL \
    PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY \
    PREVIEW=$PREVIEW \
    ASTRO_TELEMETRY_DISABLED=1
RUN npm run build

FROM nginx:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

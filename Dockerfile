# Self-hosted preview of the site: Node builds it, nginx serves the static files.
# Settings come from stack.env (see docker-compose.yml).

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Dev dependencies (wrangler, type checker) aren't needed to build.
RUN npm ci --omit=dev
COPY . .
# Preview mode: no analytics, every page noindex. The Turnstile key is Cloudflare's public
# always-pass test key; the preview form doesn't send email anyway.
ENV PREVIEW=true \
    PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA \
    ASTRO_TELEMETRY_DISABLED=1
# SITE_URL comes from stack.env (CRLF stripped in case the file was saved on Windows).
RUN sed 's/\r$//' stack.env > /tmp/stack.env \
    && set -a && . /tmp/stack.env && set +a \
    && test -n "$SITE_URL" || { echo "SITE_URL is not set in stack.env" >&2; exit 1; } \
    && npm run build

FROM nginx:1.29-alpine
# Drop the stock config (it listens on port 80, which Nginx Proxy Manager uses on the host).
RUN rm /etc/nginx/conf.d/default.conf
# The nginx image fills ${PORT} in from the container environment (stack.env) at startup.
COPY deploy/nginx.conf.template /etc/nginx/templates/todomoto.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

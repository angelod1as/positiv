FROM node:24.22.1-alpine AS development-dependencies-env
RUN corepack enable
COPY . /app
WORKDIR /app
RUN pnpm install --frozen-lockfile

FROM node:24.22.1-alpine AS production-dependencies-env
RUN corepack enable
COPY ./package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
WORKDIR /app
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:24.22.1-alpine AS build-env
RUN corepack enable

# Public config is inlined into the client bundle, so it has to be present
# while building. Coolify injects these as build args for every variable with
# "Build Variable" enabled; declaring them here makes the contract explicit and
# turns a missing value into a failed build instead of a bundle full of
# undefined. Nothing sensitive belongs in this list.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_UMAMI_URL
ARG VITE_GTM_ID
ARG VITE_APP_DOMAIN
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY \
    VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID \
    VITE_UMAMI_URL=$VITE_UMAMI_URL \
    VITE_GTM_ID=$VITE_GTM_ID \
    VITE_APP_DOMAIN=$VITE_APP_DOMAIN

COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN pnpm run build

FROM node:24.22.1-alpine

# This image is a production artifact, so it says so itself rather than relying
# on the platform to remember. Without this, the schema defaults would apply and
# the container would behave as development — skipping production-only
# protections and not enforcing the secrets that are required in production.
# Anything the platform injects still wins.
ENV APP_ENV=production \
    NODE_ENV=production

# The server build ships with source maps, so stacks in the logs and in the
# Telegram alerts point at app/... file:line rather than build/server/index.js.
ENV NODE_OPTIONS=--enable-source-maps

# .env.schema ships with the image: varlock reads it at boot to validate the
# environment injected by the host and to redact sensitive values in logs.
COPY ./package.json pnpm-lock.yaml .env.schema /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app

# Coolify's rolling update stops the old container once the new one reports
# "Started", which Docker says the moment the process is spawned. An image that
# exits on a bad environment therefore replaced a working one, traefik was left
# with no backend, and the deployment was still recorded as finished.
#
# This makes the container's health an observable fact: with it the platform
# reports running:healthy instead of running:unknown, which is what any check
# has to be built on. It is not by itself the safety net. Coolify gates a
# rolling update on health only with health_check_enabled turned on for the
# application, and its documentation does not say what it does when a new
# container never becomes healthy. Until that is turned on and tested with a
# deliberate bad boot, treat the smoke job in production.yml as the thing that
# will actually tell you.
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# The start script, without pnpm: `pnpm run` checks the dependencies first and,
# finding the runtime node_modules out of step with the workspace, reinstalls
# them at boot. scripts/production-start.test.ts keeps the two in step.
CMD ["node_modules/.bin/varlock", "run", "--", "node_modules/.bin/react-router-serve", "./build/server/index.js"]
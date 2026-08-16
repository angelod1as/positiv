FROM node:24-alpine AS development-dependencies-env
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY . /app
WORKDIR /app
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS production-dependencies-env
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY ./package.json pnpm-lock.yaml /app/
WORKDIR /app
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:24-alpine AS build-env
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

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
ARG VITE_BANNER_MESSAGE
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY \
    VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID \
    VITE_UMAMI_URL=$VITE_UMAMI_URL \
    VITE_GTM_ID=$VITE_GTM_ID \
    VITE_APP_DOMAIN=$VITE_APP_DOMAIN \
    VITE_BANNER_MESSAGE=$VITE_BANNER_MESSAGE

COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN pnpm run build

FROM node:24-alpine
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

# This image is a production artifact, so it says so itself rather than relying
# on the platform to remember. Without this, the schema defaults would apply and
# the container would behave as development — skipping production-only
# protections and not enforcing the secrets that are required in production.
# Anything the platform injects still wins.
ENV APP_ENV=production \
    NODE_ENV=production

# .env.schema ships with the image: varlock reads it at boot to validate the
# environment injected by the host and to redact sensitive values in logs.
COPY ./package.json pnpm-lock.yaml .env.schema /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
CMD ["pnpm", "run", "start"]
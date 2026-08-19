import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

// varlock replaces `ENV.X` with a build-time constant for every item it
// considers static, which deletes whole `if (ENV.FLAG)` branches from the
// bundle as dead code. `@varlock/vite-integration` decides with
// `itemInfo.isDynamic ?? itemInfo.isSensitive`, and `varlock load` omits
// isDynamic when it matches that inferred default — so the effective value is
// what this file asserts, not the raw field.

type EnvSchemaItem = { isSensitive?: boolean; isDynamic?: boolean }

// Read on the server, where the value only exists at runtime. Inlining any of
// these freezes a build-time value into production: APP_ENV decides the secure
// cookie flag and the logger, APP_URL builds absolute links in emails, E2E_MODE
// guards every Listmonk call.
const MUST_RESOLVE_AT_RUNTIME = [
  "APP_ENV",
  "APP_URL",
  "CI",
  "E2E_MODE",
  "IS_PROD_IN_DEV",
  "LISTMONK_API_URL",
  "TELEGRAM_ALERTS_ENABLED",
  "TELEGRAM_CHAT_ID",
]

// Read in the browser, which has no process to resolve them from. A dynamic
// value here would need hydration over varlock's /__varlock/public-env
// endpoint, which this app does not serve.
const MUST_BE_INLINED_IN_THE_CLIENT_BUNDLE = [
  "NODE_ENV",
  "VITE_APP_DOMAIN",
  "VITE_BANNER_MESSAGE",
  "VITE_GTM_ID",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_URL",
  "VITE_TURNSTILE_SITE_KEY",
  "VITE_UMAMI_URL",
  "VITE_UMAMI_WEBSITE_ID",
]

function loadSchema(): Record<string, EnvSchemaItem> {
  const stdout = execFileSync(
    "node_modules/.bin/varlock",
    ["load", "--format", "json-full", "--compact"],
    { encoding: "utf8" },
  )

  return JSON.parse(stdout).config
}

function resolvesAtRuntime(item: EnvSchemaItem): boolean {
  return item.isDynamic ?? !!item.isSensitive
}

describe(".env.schema", () => {
  const config = loadSchema()

  it.each(MUST_RESOLVE_AT_RUNTIME)("resolves %s at runtime", (key) => {
    expect(config[key]).toBeDefined()
    expect(resolvesAtRuntime(config[key])).toBe(true)
  })

  it.each(MUST_BE_INLINED_IN_THE_CLIENT_BUNDLE)("inlines %s", (key) => {
    expect(config[key]).toBeDefined()
    expect(resolvesAtRuntime(config[key])).toBe(false)
  })
})

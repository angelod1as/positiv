import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

// varlock replaces `ENV.X` with a build-time constant for every item it
// considers static, which deletes whole `if (ENV.FLAG)` branches from the
// bundle as dead code. `@varlock/vite-integration` decides with
// `itemInfo.isDynamic ?? itemInfo.isSensitive`, and `varlock load` omits
// isDynamic when it matches that inferred default — so the effective value is
// what this file asserts, not the raw field. That inference is varlock's own
// and is not part of its documented output; it was read out of varlock 1.16.1
// and @varlock/vite-integration 1.4.0, so a major bump is worth re-reading.
// runtime-flags.spec.ts checks the built bundle instead, which is what catches
// this file agreeing with itself while varlock changed underneath.

type EnvSchemaItem = { isSensitive?: boolean; isDynamic?: boolean }

// Read on the server, where the value only exists at runtime. Inlining any of
// these freezes a build-time value into production: APP_ENV decides the secure
// cookie flag and the logger, APP_URL builds absolute links in emails, E2E_MODE
// guards every Listmonk call. IS_PROD_IN_DEV and LISTMONK_API_URL are read by
// destructuring today, which the replacement never touched, so neither was
// actually broken — they are here so that dot access stays a safe refactor.
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

// varlock exits non-zero when a required value is missing, which is the normal
// state of a unit test run: CI has no .env and does not need one. It still
// writes the whole schema to stdout, and the classification asked about here
// comes from the schema rather than from any value — so read stdout either way,
// as @varlock/vite-integration does with its own failed loads.
function loadSchema(): Record<string, EnvSchemaItem> {
  let stdout: string

  try {
    stdout = execFileSync(
      "node_modules/.bin/varlock",
      ["load", "--format", "json-full", "--compact"],
      { encoding: "utf8" },
    )
  } catch (error) {
    stdout = (error as { stdout?: string }).stdout ?? ""
  }

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

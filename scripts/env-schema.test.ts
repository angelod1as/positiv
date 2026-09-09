import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
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
// The Asaas items are server-only: PAYMENTS_ENABLED is the kill switch every
// payment route reads, and inlining it would delete the guard from the build
// rather than let the running container turn payments off.
const MUST_RESOLVE_AT_RUNTIME = [
  "APP_ENV",
  "APP_URL",
  "ASAAS_ANTICIPATION_DETACHED_MONTHLY_RATE",
  "ASAAS_ANTICIPATION_INSTALLMENT_MONTHLY_RATE",
  "ASAAS_API_URL",
  "CI",
  "E2E_MODE",
  "IS_PROD_IN_DEV",
  "LISTMONK_API_URL",
  "PAYMENTS_ENABLED",
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

  // The rule the two lists are instances of, stated over the whole schema so
  // that a variable added tomorrow is covered without anyone remembering to
  // list it here. The lists stay because they record what each variable costs
  // when it is classified wrong; this catches the ones nobody thought about.
  it("inlines the browser's variables and nothing else", () => {
    const misclassified = Object.entries(config)
      .filter(([key, item]) => {
        const inlined = !resolvesAtRuntime(item)
        const belongsInTheClientBundle =
          key.startsWith("VITE_") || key === "NODE_ENV"

        return inlined !== belongsInTheClientBundle
      })
      .map(([key]) => key)

    expect(misclassified).toEqual([])
  })
})

// Production's values do not live in one place: some are GitHub secrets, some
// are set in Coolify, some only ever exist on a laptop. Nothing can read all
// three from here, so CI cannot check that production holds a value — the
// production env check in deploy-and-test.yml supplies its own, and proves the
// schema is satisfiable rather than that the deploy is.
//
// What is checkable is whether anyone wrote down where a required value comes
// from. A variable that production must have and that nobody sourced is the
// shape of the outage that prompted this: APP_URL became required, no
// environment had it, and the container refused to boot.
const PRODUCTION_SOURCE = /^#\s*production value:/m

// A blank line ends a comment block: anything that is neither a comment nor a
// declaration resets what has been collected. The schema relies on this to keep
// its section headers — `# ---` / `# Supabase` / `# ---` — from being read as
// the doc comment of whatever variable happens to follow them. The cost is that
// a blank line inserted between a comment and its variable silently detaches
// the two, and the only symptom is this file failing for a reason that has
// nothing to do with what was edited.
function declarationsIn(schema: string) {
  const declarations: { key: string; comments: string }[] = []
  let comments: string[] = []

  for (const line of schema.split("\n")) {
    if (line.startsWith("#")) {
      comments.push(line)
      continue
    }

    const [, key] = /^([A-Z][A-Z0-9_]*)=/.exec(line) ?? []

    if (key) declarations.push({ key, comments: comments.join("\n") })

    comments = []
  }

  return declarations
}

describe(".env.schema required values", () => {
  const declarations = declarationsIn(readFileSync(".env.schema", "utf8"))

  it("finds the variables it is meant to be reading", () => {
    expect(declarations.map(({ key }) => key)).toContain("COOKIE_SECRET")
  })

  it("says where production gets every value it requires", () => {
    const unsourced = declarations
      .filter(({ comments }) => comments.includes("@required"))
      .filter(({ comments }) => !PRODUCTION_SOURCE.test(comments))
      .map(({ key }) => key)

    expect(unsourced).toEqual([])
  })
})

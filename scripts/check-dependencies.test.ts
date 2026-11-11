import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import extractDepcruiseConfig from "dependency-cruiser/config-utl/extract-depcruise-config"
import { afterEach, describe, expect, it } from "vitest"
import { checkDependencies } from "./check-dependencies"

const repo = path.resolve(import.meta.dirname, "..")
const configFile = path.join(repo, ".dependency-cruiser.mjs")

const trees: string[] = []

afterEach(() => {
  for (const tree of trees.splice(0)) {
    rmSync(tree, { recursive: true, force: true })
  }
})

// A throwaway app/ tree. node_modules is the repository's, so npm imports
// resolve to the same paths they do in the real app.
async function check(files: Record<string, string>) {
  const tree = realpathSync(
    mkdtempSync(path.join(tmpdir(), "check-dependencies-")),
  )
  trees.push(tree)
  symlinkSync(path.join(repo, "node_modules"), path.join(tree, "node_modules"))
  for (const [file, source] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(tree, file)), { recursive: true })
    writeFileSync(path.join(tree, file), source)
  }
  return checkDependencies({ baseDir: tree, configFile })
}

const rulesBroken = async (files: Record<string, string>) =>
  (await check(files)).violations.map((violation) => violation.rule)

describe("checkDependencies", () => {
  it("accepts imports that follow the rules", async () => {
    const result = await check({
      "app/business/payment/charge.server.ts":
        'import { send } from "../email/send.server"\nexport const charge = send',
      "app/business/email/send.server.ts": "export const send = 1",
    })

    expect(result.violations).toEqual([])
    expect(result.domainCycles).toEqual([])
  })

  describe("import cycles", () => {
    it("rejects a runtime cycle between two modules", async () => {
      expect(
        await rulesBroken({
          "app/lib/helpers/a.ts": 'import { b } from "./b"\nexport const a = b',
          "app/lib/helpers/b.ts": 'import { a } from "./a"\nexport const b = a',
        }),
      ).toContain("no-circular")
    })

    it("lets a module cycle through a type-only import pass", async () => {
      expect(
        await rulesBroken({
          "app/lib/helpers/a.ts":
            'import type { B } from "./b"\nexport type A = B\nexport const a = 1',
          "app/lib/helpers/b.ts":
            'import { a } from "./a"\nexport type B = string\nexport const b = a',
        }),
      ).toEqual([])
    })

    it("reports two domains that import each other through different files", async () => {
      const result = await check({
        "app/business/email/render.ts":
          'import { schema } from "../cms/schema"\nexport const render = schema',
        "app/business/cms/schema.ts": "export const schema = 1",
        "app/business/cms/fixture.ts":
          'import { variables } from "../email/variables"\nexport const fixture = variables',
        "app/business/email/variables.ts": "export const variables = 1",
      })

      expect(result.violations).toEqual([])
      expect(result.domainCycles.map((cycle) => cycle.domains)).toEqual([
        ["cms", "email"],
      ])
    })

    it("counts a type-only import and a test file toward a domain cycle", async () => {
      const result = await check({
        "app/business/email/render.ts":
          'import type { Schema } from "../cms/schema"\nexport type Render = Schema',
        "app/business/cms/schema.ts": "export type Schema = string",
        "app/business/cms/schema.test.ts":
          'import { variables } from "../email/variables"\nexport const used = variables',
        "app/business/email/variables.ts": "export const variables = 1",
      })

      expect(result.domainCycles.map((cycle) => cycle.domains)).toEqual([
        ["cms", "email"],
      ])
      expect(result.domainCycles[0].imports).toContain(
        "app/business/cms/schema.test.ts → app/business/email/variables.ts (test)",
      )
    })
  })

  describe("lib never imports business", () => {
    it("rejects a type-only import from business", async () => {
      expect(
        await rulesBroken({
          "app/lib/helpers/format.ts":
            'import type { Price } from "../../business/payment/pricing"\nexport type Format = Price',
          "app/business/payment/pricing.ts": "export type Price = number",
        }),
      ).toEqual(["lib-not-to-business"])
    })
  })

  describe("pages never reach the database", () => {
    it.each([
      ['import { db } from "../../lib/supabase/db.server"', "db.server"],
      ['import { client } from "../../lib/supabase/server"', "the Supabase server client"],
      ['import type { Kysely } from "kysely"', "Kysely"],
      ['import pg from "pg"', "pg"],
    ])("rejects %s (%s)", async (statement) => {
      expect(
        await rulesBroken({
          "app/pages/admin/page.tsx": `${statement}\nexport const x = 1`,
          "app/lib/supabase/db.server.ts": "export const db = 1",
          "app/lib/supabase/server.ts": "export const client = 1",
        }),
      ).toContain("pages-not-to-database")
    })

    it("lets a page test mock the database", async () => {
      expect(
        await rulesBroken({
          "app/pages/admin/page.test.tsx":
            'import { db } from "../../lib/supabase/db.server"\nexport const x = db',
          "app/lib/supabase/db.server.ts": "export const db = 1",
        }),
      ).toEqual([])
    })
  })

  describe("a vendor SDK stays in its domain", () => {
    it.each([
      ["app/business/payment/notify.server.ts", 'import nodemailer from "nodemailer"', "nodemailer-only-in-email"],
      ["app/business/payment/content.server.ts", 'import { createClient } from "@sanity/client"', "sanity-only-in-cms"],
      ["app/pages/page.tsx", 'import type { SanityClient } from "@sanity/client"', "sanity-only-in-cms"],
      ["app/business/application/cancel.server.ts", 'import { asaas } from "../payment/provider/asaas/asaas-client.server"', "asaas-only-in-payment"],
      ["app/business/profile/subscribe.server.ts", 'import { listmonk } from "../newsletter/listmonk-client.server"', "listmonk-only-in-newsletter"],
    ])("rejects %s importing %s", async (file, statement, rule) => {
      expect(
        await rulesBroken({
          [file]: `${statement}\nexport const x = 1`,
          "app/business/payment/provider/asaas/asaas-client.server.ts":
            "export const asaas = 1",
          "app/business/newsletter/listmonk-client.server.ts":
            "export const listmonk = 1",
        }),
      ).toEqual([rule])
    })

    it.each([
      ["app/business/email/transport.server.ts", 'import nodemailer from "nodemailer"'],
      ["app/business/cms/client.server.ts", 'import { createClient } from "@sanity/client"'],
      ["app/components/pages/root/visual-editing.tsx", 'import { createClient } from "@sanity/client"'],
      ["app/business/payment/charge.server.ts", 'import { asaas } from "./provider/asaas/asaas-client.server"'],
    ])("lets %s import %s", async (file, statement) => {
      expect(
        await rulesBroken({
          [file]: `${statement}\nexport const x = 1`,
          "app/business/payment/provider/asaas/asaas-client.server.ts":
            "export const asaas = 1",
        }),
      ).toEqual([])
    })
  })

  describe("settings imports no other domain", () => {
    it("rejects settings importing payment", async () => {
      expect(
        await rulesBroken({
          "app/business/settings/app-settings.server.ts":
            'import { provider } from "../payment/provider.server"\nexport const x = provider',
          "app/business/payment/provider.server.ts": "export const provider = 1",
        }),
      ).toEqual(["settings-imports-no-domain"])
    })
  })

  describe("pg stays in lib/supabase", () => {
    it("rejects pg anywhere else", async () => {
      expect(
        await rulesBroken({
          "app/lib/helpers/query.ts": 'import pg from "pg"\nexport const x = pg',
        }),
      ).toEqual(["pg-only-in-lib-supabase"])
    })

    it("lets lib/supabase and the test harness import pg", async () => {
      expect(
        await rulesBroken({
          "app/lib/supabase/pool.server.ts": 'import pg from "pg"\nexport const x = pg',
          "app/test/db.ts": 'import pg from "pg"\nexport const y = pg',
        }),
      ).toEqual([])
    })
  })

  // A rule that names a file or folder matches nothing once that path is
  // renamed, and passes silently from then on.
  it("names only paths that exist in this repository", async () => {
    const { forbidden = [] } = await extractDepcruiseConfig(configFile)
    const patterns = forbidden.flatMap((rule) =>
      [
        rule.from.path,
        rule.from.pathNot,
        ...("to" in rule ? [rule.to.path, rule.to.pathNot] : []),
      ].flat(),
    )
    const literalPrefix = (pattern: string) =>
      pattern
        .replace(/^\^/, "")
        .replace(/\$$/, "")
        .replaceAll("\\.", ".")
        .split(/[()[\]?*+|]/)[0]

    const missing = patterns
      .filter((pattern): pattern is string => pattern?.startsWith("^app/") ?? false)
      .map(literalPrefix)
      .filter((prefix) => !existsSync(path.join(repo, prefix)))

    expect(missing).toEqual([])
  })

  it("passes on this repository", { timeout: 120_000 }, async () => {
    const result = await checkDependencies({ baseDir: repo, configFile })

    expect(result.violations).toEqual([])
    expect(result.domainCycles).toEqual([])
  })
})

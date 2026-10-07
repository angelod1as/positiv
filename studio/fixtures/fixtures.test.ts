import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  siteSettingsContent,
  testPageContent,
} from "../../e2e/fixtures/test-page-content"
import { generateSiteSnapshotFixture, serializeFixture } from "./generate"

function committed(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../e2e/fixtures/${name}`, import.meta.url)),
    "utf8",
  )
}

describe("e2e fixtures generated from the seed", () => {
  it("keeps pages-snapshot.json current — run `pnpm --filter studio fixtures`", async () => {
    const { pages } = await generateSiteSnapshotFixture()

    expect(committed("pages-snapshot.json")).toBe(serializeFixture(pages))
  })

  it("keeps site-settings.json current — run `pnpm --filter studio fixtures`", async () => {
    const { siteSettings } = await generateSiteSnapshotFixture()

    expect(committed("site-settings.json")).toBe(serializeFixture(siteSettings))
  })
})

// The e2e specs assert these seed-owned strings. Guarding them here fails fast
// when the seed drifts, instead of leaving it for the slow e2e run.
describe("the fixtures carry the content the e2e specs assert", () => {
  const pages = committed("pages-snapshot.json")
  const siteSettings = committed("site-settings.json")

  it.each(Object.values(testPageContent))(
    "pages-snapshot.json contains %s",
    (text) => {
      expect(pages).toContain(text)
    },
  )

  it.each(Object.values(siteSettingsContent))(
    "site-settings.json contains %s",
    (text) => {
      expect(siteSettings).toContain(text)
    },
  )
})

import { describe, expect, it } from "vitest"
import { pagesQuery } from "./pages-query"
import { siteSnapshotQuery } from "./site-snapshot-query"

describe("pagesQuery", () => {
  it("joins the public part a Regras Section picked from the Rules", () => {
    expect(pagesQuery).toContain(
      'part == "generalRules" => *[_id == "rules"][0].generalRules',
    )
    expect(pagesQuery).toContain(
      'part == "agreements" => *[_id == "rules"][0].agreements',
    )
  })

  it("reads the title and subtitle the Editor wrote on the Regras Section", () => {
    expect(pagesQuery).toMatch(
      /_type == "rulesSection" => \{\s*part,\s*title,\s*subtitle,/,
    )
  })

  // The snapshot is cached for every visitor and, in draft mode, sent to the
  // browser: the Regras Privadas are read per request, only for a signed-in
  // visitor.
  it("never reads the Regras Privadas", () => {
    expect(siteSnapshotQuery).not.toContain("privateRules")
  })
})

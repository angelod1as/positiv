import { describe, expect, it } from "vitest"

import { SITE_SETTINGS_ID } from "../../singletons"
import { footerDevelopmentUnset } from "./transform"

describe("footerDevelopmentUnset", () => {
  it("unsets footer.development", () => {
    expect(footerDevelopmentUnset().unset).toEqual(["footer.development"])
  })

  it("targets the published and draft siteSettings documents", () => {
    expect(footerDevelopmentUnset().ids).toEqual([
      SITE_SETTINGS_ID,
      `drafts.${SITE_SETTINGS_ID}`,
    ])
  })

  it("returns the same spec every time", () => {
    expect(footerDevelopmentUnset()).toEqual(footerDevelopmentUnset())
  })
})

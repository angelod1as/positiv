import { describe, expect, it } from "vitest"

import { EMAIL_TEMPLATES_ID } from "../../singletons"
import { registrationLimitEmailUnset } from "./transform"

describe("registrationLimitEmailUnset", () => {
  it("unsets registrationLimit", () => {
    expect(registrationLimitEmailUnset().unset).toEqual(["registrationLimit"])
  })

  it("targets the published and draft emailTemplates documents", () => {
    expect(registrationLimitEmailUnset().ids).toEqual([
      EMAIL_TEMPLATES_ID,
      `drafts.${EMAIL_TEMPLATES_ID}`,
    ])
  })

  it("returns the same spec every time", () => {
    expect(registrationLimitEmailUnset()).toEqual(registrationLimitEmailUnset())
  })
})

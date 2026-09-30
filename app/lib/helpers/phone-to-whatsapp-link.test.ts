import { describe, expect, it } from "vitest"
import { phoneToWhatsAppLink } from "./phone-to-whatsapp-link"

describe("phoneToWhatsAppLink", () => {
  it("puts Brazil's country code in front of a Brazilian mobile", () => {
    expect(phoneToWhatsAppLink(11999887766)).toBe(
      "https://wa.me/5511999887766",
    )
  })

  it("leaves a flagged international number as it is, whatever its length", () => {
    expect(phoneToWhatsAppLink(12125551234, true)).toBe(
      "https://wa.me/12125551234",
    )
    expect(phoneToWhatsAppLink(351912345678, true)).toBe(
      "https://wa.me/351912345678",
    )
  })

  it("links nothing without a phone", () => {
    expect(phoneToWhatsAppLink(null)).toBeUndefined()
  })
})

import { describe, expect, it } from "vitest"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"
import { cpfExemptionLinks } from "./cpf-exemption-link"

const readText = (link: string) => new URL(link).searchParams.get("text") ?? ""

describe("cpfExemptionLinks", () => {
  const links = cpfExemptionLinks({
    origin: "https://positivparty.com",
    profileId: "4f7a2c1e-0000-4000-8000-000000000001",
  })

  it("opens a WhatsApp chat with the organisation", () => {
    expect(links.request.startsWith(`https://wa.me/${POSITIV_WHATSAPP}?`)).toBe(
      true,
    )
    expect(links.change.startsWith(`https://wa.me/${POSITIV_WHATSAPP}?`)).toBe(
      true,
    )
  })

  it("hands the admin the participant's profile in the request", () => {
    expect(readText(links.request)).toContain(
      "https://positivparty.com/admin/participantes/4f7a2c1e-0000-4000-8000-000000000001",
    )
  })

  it("hands the admin the participant's profile when asking for a change", () => {
    expect(readText(links.change)).toContain(
      "https://positivparty.com/admin/participantes/4f7a2c1e-0000-4000-8000-000000000001",
    )
  })

  it("says different things for asking and for changing", () => {
    expect(readText(links.request)).not.toBe(readText(links.change))
  })
})

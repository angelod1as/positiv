import { describe, expect, it } from "vitest"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"
import { cpfExemptionLinks } from "./cpf-exemption-link"

const readText = (link: string) => new URL(link).searchParams.get("text") ?? ""

describe("cpfExemptionLinks", () => {
  const profileId = "4f7a2c1e-0000-4000-8000-000000000001"
  const links = cpfExemptionLinks({ profileId })

  it("opens a WhatsApp chat with the organisation", () => {
    expect(links.request.startsWith(`https://wa.me/${POSITIV_WHATSAPP}?`)).toBe(
      true,
    )
    expect(links.change.startsWith(`https://wa.me/${POSITIV_WHATSAPP}?`)).toBe(
      true,
    )
  })

  it("asks for help without a CPF, carrying only the profile ID", () => {
    expect(readText(links.request)).toBe(
      `Hello Positiv, I don't have a CPF. Can you help me? ID: ${profileId}`,
    )
  })

  it("asks to add a CPF, carrying only the profile ID", () => {
    expect(readText(links.change)).toBe(
      `Olá Positiv, quero inserir um CPF no meu perfil. Podem me ajudar? ID: ${profileId}`,
    )
  })

  // Anyone can edit a pre-written message before sending it. A link in it is
  // one the admin could be tricked into following -- the ID is looked up on
  // the real site instead.
  it("carries no link the admin could be sent to", () => {
    expect(readText(links.request)).not.toMatch(/https?:|\.com/)
    expect(readText(links.change)).not.toMatch(/https?:|\.com/)
  })
})

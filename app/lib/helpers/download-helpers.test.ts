import { describe, expect, it } from "vitest"
import { mapParticipantsToDownloadFormat } from "./download-helpers"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"

const participant = (
  overrides: Partial<ProfileWithExtraData>,
): ProfileWithExtraData =>
  ({
    id: "1",
    full_name: "João Silva",
    social_name: "João",
    cpf: "52998224725",
    rg: "12345678",
    rg_issuer: "SSP",
    approved_to_attend: "approved",
    spot_type: "regular",
    ...overrides,
  }) as ProfileWithExtraData

describe("mapParticipantsToDownloadFormat", () => {
  it("should map each participant to the columns the motel needs, in order", () => {
    const result = mapParticipantsToDownloadFormat([participant({})])

    expect(result).toEqual([
      {
        "Nome completo": "João Silva",
        "Nome social ou apelido": "João",
        CPF: "529.982.247-25",
        Staff: "",
      },
    ])
    expect(Object.keys(result[0])).toEqual([
      "Nome completo",
      "Nome social ou apelido",
      "CPF",
      "Staff",
    ])
  })

  it("should show 'Staff' for staff participants", () => {
    const result = mapParticipantsToDownloadFormat([
      participant({ spot_type: "staff" }),
    ])

    expect(result[0]["Staff"]).toBe("Staff")
  })

  it("should show empty string for non-staff participants", () => {
    const result = mapParticipantsToDownloadFormat([
      participant({ spot_type: "regular" }),
      participant({ id: "2", spot_type: "social" }),
    ])

    expect(result[0]["Staff"]).toBe("")
    expect(result[1]["Staff"]).toBe("")
  })

  it("should leave the CPF empty when the participant has none", () => {
    const result = mapParticipantsToDownloadFormat([participant({ cpf: null })])

    expect(result[0]["CPF"]).toBe("")
  })

  it("should leave out the row number, approval status and RG", () => {
    const result = mapParticipantsToDownloadFormat([participant({})])

    expect(result[0]).not.toHaveProperty("Nº")
    expect(result[0]).not.toHaveProperty("Status de Aprovação")
    expect(result[0]).not.toHaveProperty("RG")
    expect(result[0]).not.toHaveProperty("Emissor do RG")
  })

  it("should handle empty array", () => {
    expect(mapParticipantsToDownloadFormat([])).toEqual([])
  })
})

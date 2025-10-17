import { describe, expect, it } from "vitest"
import { mapParticipantsToDownloadFormat } from "./download-helpers"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"

describe("mapParticipantsToDownloadFormat", () => {
  it("should add row numbering starting from 1", () => {
    const participants: ProfileWithExtraData[] = [
      {
        id: "1",
        full_name: "João Silva",
        social_name: "João",
        rg: "12345678",
        rg_issuer: "SSP",
        approved_to_attend: "approved",
        spot_type: "regular",
      } as ProfileWithExtraData,
      {
        id: "2",
        full_name: "Maria Santos",
        social_name: "Maria",
        rg: "87654321",
        rg_issuer: "SSP",
        approved_to_attend: "approved",
        spot_type: "regular",
      } as ProfileWithExtraData,
    ]

    const result = mapParticipantsToDownloadFormat(participants)

    expect(result[0]["Nº"]).toBe(1)
    expect(result[1]["Nº"]).toBe(2)
  })

  it("should show 'Staff' for staff participants", () => {
    const participants: ProfileWithExtraData[] = [
      {
        id: "1",
        full_name: "João Silva",
        social_name: "João",
        rg: "12345678",
        rg_issuer: "SSP",
        approved_to_attend: "approved",
        spot_type: "staff",
      } as ProfileWithExtraData,
    ]

    const result = mapParticipantsToDownloadFormat(participants)

    expect(result[0]["Staff"]).toBe("Staff")
  })

  it("should show empty string for non-staff participants", () => {
    const participants: ProfileWithExtraData[] = [
      {
        id: "1",
        full_name: "João Silva",
        social_name: "João",
        rg: "12345678",
        rg_issuer: "SSP",
        approved_to_attend: "approved",
        spot_type: "regular",
      } as ProfileWithExtraData,
      {
        id: "2",
        full_name: "Maria Santos",
        social_name: "Maria",
        rg: "87654321",
        rg_issuer: "SSP",
        approved_to_attend: "approved",
        spot_type: "social",
      } as ProfileWithExtraData,
    ]

    const result = mapParticipantsToDownloadFormat(participants)

    expect(result[0]["Staff"]).toBe("")
    expect(result[1]["Staff"]).toBe("")
  })

  it("should include all required participant fields", () => {
    const participants: ProfileWithExtraData[] = [
      {
        id: "1",
        full_name: "João Silva",
        social_name: "João",
        rg: "12345678",
        rg_issuer: "SSP",
        approved_to_attend: "approved",
        spot_type: "regular",
      } as ProfileWithExtraData,
    ]

    const result = mapParticipantsToDownloadFormat(participants)

    expect(result[0]).toHaveProperty("Nº")
    expect(result[0]).toHaveProperty("Staff")
    expect(result[0]).toHaveProperty("Status de Aprovação")
    expect(result[0]).toHaveProperty("Nome completo")
    expect(result[0]).toHaveProperty("Nome social ou apelido")
    expect(result[0]).toHaveProperty("RG")
    expect(result[0]).toHaveProperty("Emissor do RG")
  })

  it("should correctly map all field values", () => {
    const participants: ProfileWithExtraData[] = [
      {
        id: "1",
        full_name: "João Silva",
        social_name: "João",
        rg: "12345678",
        rg_issuer: "SSP",
        approved_to_attend: "approved",
        spot_type: "staff",
      } as ProfileWithExtraData,
    ]

    const result = mapParticipantsToDownloadFormat(participants)

    expect(result[0]["Nº"]).toBe(1)
    expect(result[0]["Staff"]).toBe("Staff")
    expect(result[0]["Status de Aprovação"]).toBe("approved")
    expect(result[0]["Nome completo"]).toBe("João Silva")
    expect(result[0]["Nome social ou apelido"]).toBe("João")
    expect(result[0]["RG"]).toBe("12345678")
    expect(result[0]["Emissor do RG"]).toBe("SSP")
  })

  it("should handle empty array", () => {
    const participants: ProfileWithExtraData[] = []

    const result = mapParticipantsToDownloadFormat(participants)

    expect(result).toEqual([])
  })
})

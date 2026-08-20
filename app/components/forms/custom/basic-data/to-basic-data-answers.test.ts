import { describe, expect, it } from "vitest"
import { toBasicDataAnswers } from "./to-basic-data-answers"

const profile = {
  full_name: "Maria Silva",
  social_name: "Mari",
  date_of_birth: "1990-01-01",
  where_lives: "São Paulo",
  how_came_to_us: "Uma amiga",
  phone: 11999999999,
  cpf: "12345678901",
  rg: "123456789",
  rg_issuer: "SSP/SP",
  gender: ["Travesti"],
  orientation: ["Bi"],
  pronouns: ["Ela/dela"],
  race_color: ["Preta"],
}

describe("toBasicDataAnswers", () => {
  it("hands nothing over when there is no profile yet", () => {
    expect(toBasicDataAnswers(null)).toEqual({})
  })

  it("fills every field the profile already holds", () => {
    expect(toBasicDataAnswers(profile)).toMatchObject({
      full_name: "Maria Silva",
      social_name: "Mari",
      where_lives: "São Paulo",
      cpf: "12345678901",
      gender: ["Travesti"],
      race_color: ["Preta"],
    })
  })

  it("writes the phone as text, because that is what the field reads", () => {
    expect(toBasicDataAnswers(profile).phone).toBe("11999999999")
  })

  it("confirms the phone with itself, so nobody retypes a number they own", () => {
    expect(toBasicDataAnswers(profile).confirm_phone).toBe("11999999999")
  })

  it("keeps a birthday to the day a date field can show", () => {
    expect(
      toBasicDataAnswers({ ...profile, date_of_birth: "1990-01-01T00:00:00Z" })
        .date_of_birth,
    ).toBe("1990-01-01")
  })

  it("leaves out what the profile has not answered", () => {
    const answers = toBasicDataAnswers({
      ...profile,
      social_name: null,
      phone: null,
      gender: null,
    })

    expect(answers).not.toHaveProperty("social_name")
    expect(answers).not.toHaveProperty("phone")
    expect(answers).not.toHaveProperty("confirm_phone")
    expect(answers).not.toHaveProperty("gender")
  })
})

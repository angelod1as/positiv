import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { buildBasicDataQuestions } from "./build-basic-data-questions"

const find = (id: string) => {
  const question = buildBasicDataQuestions().find((item) => item.id === id)
  if (!question) throw new Error(`no question with id ${id}`)
  return question
}

describe("buildBasicDataQuestions", () => {
  it("asks every field the profile holds", () => {
    expect(buildBasicDataQuestions().map((question) => question.id)).toEqual([
      "full_name",
      "social_name",
      "date_of_birth",
      "where_lives",
      "how_came_to_us",
      "phone",
      "confirm_phone",
      "cpf",
      "rg",
      "rg_issuer",
      "gender",
      "orientation",
      "pronouns",
      "race_color",
    ])
  })

  it("names each question after the column it fills", () => {
    expect(find("full_name").prompt).toBe("Nome completo")
    expect(find("race_color").prompt).toBe("Cor ou Raça")
  })

  it("asks for a phone as digits and a birthday as a date", () => {
    expect(find("phone").input).toEqual({ kind: "textnumber" })
    expect(find("confirm_phone").input).toEqual({ kind: "textnumber" })
    expect(find("date_of_birth").input).toEqual({ kind: "date" })
  })

  it("offers the four demographic questions as chips that take an answer of their own", () => {
    for (const id of ["gender", "orientation", "pronouns", "race_color"]) {
      expect(find(id).input).toMatchObject({ kind: "chips", allowOther: true })
    }
  })

  it("offers every listed gender", () => {
    const input = find("gender").input
    if (input.kind !== "chips")
      throw new Error("gender is not a chips question")

    expect(input.options.map((option) => option.value)).toContain("Travesti")
    // The value is what reaches the column, so it is the label itself: the
    // demographics counted downstream are counted by these very strings.
    expect(input.options.every((option) => option.label === option.value)).toBe(
      true,
    )
  })

  it("refuses someone under eighteen", () => {
    expect(validateQuestion(find("date_of_birth"), "2020-01-01").ok).toBe(false)
    expect(validateQuestion(find("date_of_birth"), "1990-01-01").ok).toBe(true)
  })

  it("refuses a phone that is not a phone", () => {
    expect(validateQuestion(find("phone"), "1").ok).toBe(false)
    expect(validateQuestion(find("phone"), "11999999999").ok).toBe(true)
  })

  it("asks for the confirmation before comparing it to anything", () => {
    // An empty field is not a mismatch, and the schema speaks first: coercion
    // turns "" into zero, which is not a phone. Saying the numbers differ when
    // one of them was never typed would describe the wrong problem.
    expect(validateQuestion(find("confirm_phone"), "", {})).toEqual({
      ok: false,
      message: "Número inválido",
    })
  })

  it("refuses a confirmation that differs from the phone", () => {
    expect(
      validateQuestion(find("confirm_phone"), "11888888888", {
        phone: "11999999999",
      }),
    ).toEqual({
      ok: false,
      message: "Os números de telefone são diferentes",
    })

    expect(
      validateQuestion(find("confirm_phone"), "11999999999", {
        phone: "11999999999",
      }).ok,
    ).toBe(true)
  })

  it("refuses a social name that only repeats the full name", () => {
    expect(
      validateQuestion(find("social_name"), "maria  silva", {
        full_name: "Maria Silva",
      }),
    ).toEqual({
      ok: false,
      message: "O nome social deve ser diferente do nome completo",
    })

    expect(
      validateQuestion(find("social_name"), "Mari", {
        full_name: "Maria Silva",
      }).ok,
    ).toBe(true)
  })

  it("lets someone skip the social name entirely", () => {
    expect(validateQuestion(find("social_name"), undefined, {}).ok).toBe(true)
  })

  it("lets someone skip what is optional on the profile", () => {
    expect(validateQuestion(find("where_lives"), undefined, {}).ok).toBe(true)
    expect(validateQuestion(find("how_came_to_us"), undefined, {}).ok).toBe(
      true,
    )
  })

  it("insists on at least one answer for each demographic question", () => {
    expect(validateQuestion(find("gender"), []).ok).toBe(false)
    expect(validateQuestion(find("gender"), ["Travesti"]).ok).toBe(true)
  })

  it("carries the descriptions the fields already had", () => {
    expect(find("phone").help).toBe("Só números, com DDD. Ex: 11955552222")
    expect(find("full_name").help).toBeUndefined()
  })
})

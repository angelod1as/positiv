import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { basicDataFieldsSchema } from "~/business/profile/profile-schemas"
import { basicDataValidation } from "~/copy/account"
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
      "phone_is_international",
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

  it("offers a box for a phone from outside Brazil", () => {
    expect(find("phone_is_international").input).toEqual({ kind: "boolean" })
    expect(find("phone_is_international").prompt).toBe("Celular internacional")
  })

  it("refuses a landline or a mobile missing its ninth digit", () => {
    expect(validateQuestion(find("phone"), "1133334444", {})).toEqual({
      ok: false,
      message: basicDataValidation.notAMobile,
    })
    expect(
      validateQuestion(find("phone"), "1199998888", {
        phone_is_international: false,
      }).ok,
    ).toBe(false)
  })

  it("takes a foreign number only once the box is ticked", () => {
    expect(validateQuestion(find("phone"), "351912345678", {})).toEqual({
      ok: false,
      message: basicDataValidation.notAMobile,
    })
    expect(
      validateQuestion(find("phone"), "351912345678", {
        phone_is_international: true,
      }).ok,
    ).toBe(true)
  })

  it("sends a Brazilian number back to the Brazilian side of the box", () => {
    expect(
      validateQuestion(find("phone"), "5511999998888", {
        phone_is_international: true,
      }),
    ).toEqual({
      ok: false,
      message: basicDataValidation.invalidInternationalPhone,
    })
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

  it("still asks for a CPF from someone who has not asked for an exemption", () => {
    const missing = basicDataFieldsSchema.shape.cpf.safeParse("")
    if (missing.success) throw new Error("an empty CPF should not parse")

    expect(validateQuestion(find("cpf"), "", {})).toEqual({
      ok: false,
      message: missing.error.issues[0].message,
    })
    expect(validateQuestion(find("cpf"), "11144477736", {})).toEqual({
      ok: false,
      message: basicDataValidation.invalidCpf,
    })
    expect(validateQuestion(find("cpf"), "11144477735", {}).ok).toBe(true)
  })

  it("lets the CPF go empty while an exemption is being asked for", () => {
    const asking = { cpf_exempt_requested: true }

    expect(validateQuestion(find("cpf"), "", asking).ok).toBe(true)
    expect(validateQuestion(find("cpf"), undefined, asking).ok).toBe(true)
  })

  it("still checks a CPF typed in while asking for an exemption", () => {
    expect(
      validateQuestion(find("cpf"), "11144477736", {
        cpf_exempt_requested: true,
      }),
    ).toEqual({ ok: false, message: basicDataValidation.invalidCpf })
  })

  describe("for a profile exempted from the CPF", () => {
    const exempt = buildBasicDataQuestions({ cpfExempt: true })
    const findExempt = (id: string) => exempt.find((item) => item.id === id)

    it("asks no CPF", () => {
      expect(findExempt("cpf")).toBeUndefined()
    })

    it("takes a passport where the RG would go", () => {
      expect(findExempt("rg")?.prompt).toBe("RG ou passaporte")
      expect(findExempt("rg_issuer")?.prompt).toBe("Emissor ou país")
    })

    it("keeps the documents required", () => {
      const rg = findExempt("rg")
      if (!rg) throw new Error("no rg question")

      expect(validateQuestion(rg, "").ok).toBe(false)
      expect(validateQuestion(rg, "AB123456").ok).toBe(true)
    })
  })

  it("says why the CPF has to be a real one", () => {
    expect(find("cpf").help).toBe(
      "Precisamos de um CPF válido para emitir suas cobranças. Só números.",
    )
  })
})

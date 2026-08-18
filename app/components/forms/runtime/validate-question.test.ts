import { describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Question } from "./question.types"
import { validateQuestion } from "./validate-question"

const textQuestion: Question = {
  id: "full_name",
  prompt: "Nome completo",
  input: { kind: "text" },
  schema: zod.string().min(1, { message: "Resposta obrigatória" }),
}

const quizQuestion: Question = {
  id: "no-obligation",
  prompt: "Todo mundo precisa tirar a roupa?",
  input: {
    kind: "radio",
    options: [
      { label: "Não, ninguém é obrigade a nada", value: "certa" },
      { label: "Sim, claro", value: "errada" },
    ],
  },
  schema: zod
    .string()
    .min(1, { message: "Resposta obrigatória" })
    .refine((answer) => answer === "certa", {
      message: "Você escolheu a resposta errada",
    }),
}

const multiQuestion: Question = {
  id: "rules",
  prompt: "Quais regras se aplicam?",
  input: {
    kind: "checkbox",
    options: [
      { label: "Uma", value: "a" },
      { label: "Outra", value: "b" },
      { label: "Errada", value: "c" },
    ],
  },
  schema: zod
    .array(zod.string())
    .refine((answers) => answers.length > 0, {
      message: "Resposta obrigatória",
    })
    .refine((answers) => !answers.includes("c"), {
      message: "Você selecionou uma ou mais respostas incorretas",
    }),
}

const confirmQuestion: Question = {
  id: "confirmPassword",
  prompt: "Confirme a senha",
  input: { kind: "text" },
  schema: zod.string().min(1, { message: "Resposta obrigatória" }),
  refine: (value, answers) =>
    value === answers.password
      ? null
      : { ok: false, message: "As senhas não são iguais" },
}

describe("validateQuestion", () => {
  it("accepts a value that satisfies the question's schema", () => {
    expect(validateQuestion(textQuestion, "Angelo Dias")).toEqual({ ok: true })
  })

  it("rejects a value with the message defined on the schema", () => {
    expect(validateQuestion(textQuestion, "")).toEqual({
      ok: false,
      message: "Resposta obrigatória",
    })
  })

  it("rejects a missing answer instead of throwing", () => {
    const result = validateQuestion(textQuestion, undefined)

    expect(result.ok).toBe(false)
  })

  it("surfaces a refine message, so correctness checks report their own reason", () => {
    expect(validateQuestion(quizQuestion, "errada")).toEqual({
      ok: false,
      message: "Você escolheu a resposta errada",
    })
  })

  it("accepts the correct answer of a correctness-checking question", () => {
    expect(validateQuestion(quizQuestion, "certa")).toEqual({ ok: true })
  })

  it("validates array answers", () => {
    expect(validateQuestion(multiQuestion, ["a", "b"])).toEqual({ ok: true })
    expect(validateQuestion(multiQuestion, ["a", "c"])).toEqual({
      ok: false,
      message: "Você selecionou uma ou mais respostas incorretas",
    })
  })

  it("reports the first failure when a value breaks more than one rule", () => {
    const result = validateQuestion(multiQuestion, [])

    expect(result).toEqual({ ok: false, message: "Resposta obrigatória" })
  })
  it("passes a refine that agrees with the other answers", () => {
    const result = validateQuestion(confirmQuestion, "segredo123", {
      password: "segredo123",
    })

    expect(result).toEqual({ ok: true })
  })

  it("fails with the refine's message when the answers disagree", () => {
    const result = validateQuestion(confirmQuestion, "outra", {
      password: "segredo123",
    })

    expect(result).toEqual({ ok: false, message: "As senhas não são iguais" })
  })

  it("does not reach the refine when the schema already failed", () => {
    const refine = vi.fn()
    const result = validateQuestion({ ...confirmQuestion, refine }, "", {
      password: "segredo123",
    })

    expect(result).toEqual({ ok: false, message: "Resposta obrigatória" })
    expect(refine).not.toHaveBeenCalled()
  })
})

import { InputError } from "composable-functions"
import { describe, expect, it } from "vitest"
import { toCommitResult } from "./to-commit-result"

describe("toCommitResult", () => {
  it("passes a save that worked straight through", () => {
    expect(toCommitResult({ success: true, data: "123", errors: [] })).toEqual({
      ok: true,
    })
  })

  it("gives a refused field back to the question that asked it", () => {
    const result = toCommitResult({
      success: false,
      errors: [new InputError("Precisa ser um emoji", ["emoji"])],
    })

    expect(result).toEqual({
      ok: false,
      errors: [{ questionId: "emoji", message: "Precisa ser um emoji" }],
    })
  })

  it("keeps every refused field, in the order they were refused", () => {
    const result = toCommitResult({
      success: false,
      errors: [
        new InputError("Muito curto", ["title"]),
        new InputError("Precisa ser um emoji", ["emoji"]),
      ],
    })

    expect(result).toEqual({
      ok: false,
      errors: [
        { questionId: "title", message: "Muito curto" },
        { questionId: "emoji", message: "Precisa ser um emoji" },
      ],
    })
  })

  it("speaks for a failure no question is to blame for", () => {
    const result = toCommitResult({
      success: false,
      errors: [new Error("Erro ao salvar o evento")],
    })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: "Erro ao salvar o evento",
    })
  })

  it("says both when a field was refused and something else broke too", () => {
    const result = toCommitResult({
      success: false,
      errors: [
        new InputError("Muito curto", ["title"]),
        new Error("Erro ao salvar o evento"),
      ],
    })

    expect(result).toEqual({
      ok: false,
      errors: [{ questionId: "title", message: "Muito curto" }],
      message: "Erro ao salvar o evento",
    })
  })

  it("refuses without naming a question when the failure carries no message", () => {
    expect(toCommitResult({ success: false, errors: [] })).toEqual({
      ok: false,
      errors: [],
    })
  })

  it("lets an error that names no field speak for the save", () => {
    // A body of the wrong shape entirely is refused with an empty path. Filed
    // under a question id of "", the message reached no question and was
    // swapped for the runtime's own "could not save".
    const result = toCommitResult({
      success: false,
      errors: [new InputError("Valor inválido", [])],
    })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: "Valor inválido",
    })
  })

  it("names the field a nested path starts at", () => {
    const result = toCommitResult({
      success: false,
      errors: [new InputError("Obrigatório", ["flag", "notes"])],
    })

    expect(result).toEqual({
      ok: false,
      errors: [{ questionId: "flag", message: "Obrigatório" }],
    })
  })
})

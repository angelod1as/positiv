import { describe, expect, it } from "vitest"
import { isValidCpf } from "~/lib/helpers/cpf"
import { uniqueValidCpf } from "./unique-cpf"

describe("uniqueValidCpf", () => {
  it("hands out CPFs the app accepts", () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidCpf(uniqueValidCpf())).toBe(true)
    }
  })

  // One profile per CPF is enforced, so every account a run creates needs its
  // own.
  it("never hands out the same one twice", () => {
    const cpfs = Array.from({ length: 500 }, () => uniqueValidCpf())

    expect(new Set(cpfs).size).toBe(cpfs.length)
  })
})

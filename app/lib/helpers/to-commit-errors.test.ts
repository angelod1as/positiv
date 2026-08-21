import { describe, expect, it } from "vitest"
import { zod } from "~/lib/helpers/zod"
import { toCommitErrors } from "./to-commit-errors"

const schema = zod.object({
  email: zod.string().email(),
  password: zod.string().min(6),
})

describe("toCommitErrors", () => {
  it("names the question each issue belongs to", () => {
    const parsed = schema.safeParse({ email: "nao-e-email", password: "abc" })
    if (parsed.success) throw new Error("the schema was supposed to refuse this")

    expect(toCommitErrors(parsed.error).map((error) => error.questionId)).toEqual([
      "email",
      "password",
    ])
  })

  it("carries the message the schema wrote", () => {
    const parsed = schema.safeParse({ email: "nao-e-email", password: "abcdef" })
    if (parsed.success) throw new Error("the schema was supposed to refuse this")

    expect(toCommitErrors(parsed.error)[0].message).toBe(
      parsed.error.issues[0].message,
    )
  })

  it("leaves the question unnamed when the issue belongs to the object itself", () => {
    const refined = zod
      .object({ a: zod.string() })
      .refine(() => false, { message: "não bate" })
    const parsed = refined.safeParse({ a: "x" })
    if (parsed.success) throw new Error("the schema was supposed to refuse this")

    expect(toCommitErrors(parsed.error)).toEqual([
      { questionId: "", message: "não bate" },
    ])
  })
})

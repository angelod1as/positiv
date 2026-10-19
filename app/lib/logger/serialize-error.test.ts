import { describe, expect, it } from "vitest"

import { serializeError } from "./logger.server"

describe("serializeError", () => {
  it("flattens an Error to its message and stack", () => {
    const error = new Error("boom")

    expect(serializeError(error)).toEqual({
      message: "boom",
      stack: expect.stringContaining("boom"),
    })
  })

  it("serialises a wrapped Error cause recursively", () => {
    const cause = new Error("the real reason")
    const error = new Error("boom", { cause })

    expect(serializeError(error)).toEqual({
      message: "boom",
      stack: expect.any(String),
      cause: { message: "the real reason", stack: expect.any(String) },
    })
  })

  it("keeps a non-Error cause as-is", () => {
    const error = new Error("boom", { cause: "a string reason" })

    expect(serializeError(error)).toMatchObject({
      message: "boom",
      cause: "a string reason",
    })
  })

  it("does not overflow on a cyclic cause chain", () => {
    const a = new Error("a")
    const b = new Error("b")
    a.cause = b
    b.cause = a

    const result = serializeError(a)

    expect(result.message).toBe("a")
    expect(result).toMatchObject({
      cause: { message: "b", cause: { message: "a" } },
    })
  })

  it("stringifies a non-Error value", () => {
    expect(serializeError("plain string")).toEqual({ message: "plain string" })
    expect(serializeError(42)).toEqual({ message: "42" })
  })
})

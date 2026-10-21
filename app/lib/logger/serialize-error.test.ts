import { data, UNSAFE_ErrorResponseImpl as ErrorResponseImpl } from "react-router"
import { describe, expect, it } from "vitest"

import { serializeError } from "./logger.server"

describe("serializeError", () => {
  it("flattens an Error to its message and stack", () => {
    const error = new Error("boom")

    expect(serializeError(error)).toEqual({
      name: "Error",
      message: "boom",
      stack: expect.stringContaining("boom"),
    })
  })

  it("serialises a wrapped Error cause recursively", () => {
    const cause = new Error("the real reason")
    const error = new Error("boom", { cause })

    expect(serializeError(error)).toEqual({
      name: "Error",
      message: "boom",
      stack: expect.any(String),
      cause: {
        name: "Error",
        message: "the real reason",
        stack: expect.any(String),
      },
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

  it("keeps the class name and extra props such as code", () => {
    class AsaasError extends Error {
      code = "invalid_billing"
      status = 400
    }
    const error = new AsaasError("rejected")
    error.name = "AsaasError"

    expect(serializeError(error)).toMatchObject({
      name: "AsaasError",
      message: "rejected",
      code: "invalid_billing",
      status: 400,
    })
  })

  it("describes a thrown Response without reading its body", () => {
    const response = new Response("secret body", {
      status: 503,
      statusText: "Service Unavailable",
    })

    expect(serializeError(response)).toEqual({
      name: "Response",
      message: "Response 503 Service Unavailable",
      status: 503,
      statusText: "Service Unavailable",
      url: "",
    })
    expect(response.bodyUsed).toBe(false)
  })

  it("describes a route error response with its data", () => {
    const error = new ErrorResponseImpl(404, "Not Found", { reason: "gone" })

    expect(serializeError(error)).toEqual({
      name: "ErrorResponse",
      message: "ErrorResponse 404 Not Found",
      status: 404,
      statusText: "Not Found",
      data: { reason: "gone" },
    })
  })

  it("describes a thrown data() with its status", () => {
    expect(serializeError(data({ field: "email" }, { status: 422 }))).toEqual({
      name: "DataWithResponseInit",
      message: "DataWithResponseInit 422",
      status: 422,
      data: { field: "email" },
    })
  })

  it("names a PostgrestError-shaped plain object and keeps its fields", () => {
    const error = {
      message: 'duplicate key value violates unique constraint "x_pkey"',
      code: "23505",
      details: "Key (id)=(1) already exists.",
      hint: null,
    }

    expect(serializeError(error)).toEqual({
      name: "PostgrestError",
      message: 'duplicate key value violates unique constraint "x_pkey"',
      code: "23505",
      details: "Key (id)=(1) already exists.",
      hint: null,
    })
  })

  it("previews a plain object with no message", () => {
    expect(serializeError({ status: "failed", count: 2 })).toEqual({
      name: "Object",
      message: '{"status":"failed","count":2}',
      status: "failed",
      count: 2,
    })
  })

  it("survives a circular plain object and caps its depth and length", () => {
    const error: Record<string, unknown> = {
      long: "x".repeat(5000),
      deep: { a: { b: { c: { d: "too deep" } } } },
    }
    error.self = error

    const result = serializeError(error)

    expect(result.self).toBe("[Circular]")
    expect((result.long as string).length).toBeLessThan(1100)
    expect(JSON.stringify(result)).not.toContain("too deep")
  })

  it.each([
    ["a Response", new Response(null, { status: 500 })],
    ["a route error", new ErrorResponseImpl(500, "", null)],
    ["a data() value", data(null, { status: 500 })],
    ["a plain object", { foo: { bar: 1 } }],
    ["an object with a null prototype", Object.create(null) as object],
    ["an object message", { message: { nested: true } }],
    ["an array", [1, { a: 2 }]],
    ["null", null],
    ["undefined", undefined],
  ])("never yields [object Object] for %s", (_label, value) => {
    expect(JSON.stringify(serializeError(value))).not.toContain(
      "[object Object]",
    )
  })
})

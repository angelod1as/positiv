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

  describe("redaction", () => {
    it("drops the query string from a Response URL", () => {
      const response = new Response(null, { status: 500 })
      Object.defineProperty(response, "url", {
        value: "https://api.test/convite/abc?token=s3cret&page=2",
      })

      expect(serializeError(response).url).toBe("https://api.test/convite/abc")
    })

    it("masks an email but keeps its domain", () => {
      const result = serializeError({
        code: "23505",
        details: "Key (email)=(maria.silva@gmail.com) already exists.",
        hint: null,
        message: "duplicate key",
      })

      expect(result.details).toBe("Key (email)=(***@gmail.com) already exists.")
      expect(result.code).toBe("23505")
    })

    it.each([
      ["a formatted CPF", "Key (cpf)=(123.456.789-09) already exists.", "Key (cpf)=(***) already exists."],
      ["a bare CPF", "cpf 12345678909 is taken", "cpf *** is taken"],
      [
        "a JWT",
        "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc_DEF-123 expired",
        "token *** expired",
      ],
      ["a bearer token", "sent Bearer abc.def-123 upstream", "sent Bearer *** upstream"],
    ])("masks %s in any copied string", (_label, value, expected) => {
      expect(serializeError({ details: value }).details).toBe(expected)
    })

    it("masks the message too", () => {
      expect(
        serializeError(new Error("no profile for joao@positiv.test")).message,
      ).toBe("no profile for ***@positiv.test")
    })

    it("masks the stack, which repeats the message", () => {
      const result = serializeError(new Error("no profile for joao@positiv.test"))

      expect(result.stack).toContain("no profile for ***@positiv.test")
      expect(result.stack).not.toContain("joao@")
      expect(result.stack).toMatch(/serialize-error\.test\.ts:\d+/)
    })

    it("masks a value under a secret-looking key, at any depth", () => {
      const result = serializeError({
        message: "upstream failed",
        accessToken: "abc",
        headers: { Authorization: "Basic xyz", cookie: "sid=1" },
        config: { apiKey: "k", password: "p", secret: "s" },
      })

      expect(result).toMatchObject({
        accessToken: "***",
        headers: { Authorization: "***", cookie: "***" },
        config: { apiKey: "***", password: "***", secret: "***" },
      })
    })

    it("masks the data of a route error response", () => {
      const error = new ErrorResponseImpl(400, "Bad Request", {
        email: "ana@x.test",
      })

      expect(serializeError(error).data).toEqual({ email: "***@x.test" })
    })

    it("keeps ordinary identifiers readable", () => {
      const result = serializeError({
        message: "charge failed",
        paymentId: "pay_8f3a2b1c",
        eventId: "3f2b9c1e-7d4a-4b8e-9f1a-2c3d4e5f6a7b",
        code: "23505",
      })

      expect(result).toMatchObject({
        paymentId: "pay_8f3a2b1c",
        eventId: "3f2b9c1e-7d4a-4b8e-9f1a-2c3d4e5f6a7b",
        code: "23505",
      })
    })
  })
})

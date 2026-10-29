import { data, UNSAFE_ErrorResponseImpl as ErrorResponseImpl } from "react-router"
import { describe, expect, it } from "vitest"

import { describeFailure } from "./describe-failure.server"
import { serializeError } from "./logger.server"

function post(url: string, origin?: string) {
  return new Request(url, {
    method: "POST",
    headers: origin === undefined ? {} : { origin },
  })
}

function failureOf(error: unknown, request: Request, path: string) {
  return describeFailure(serializeError(error), request, path)
}

// React Router raises these from its own code: no frame in the app.
function frameworkError(message: string) {
  const error = new Error(message)
  error.stack = [
    `Error: ${message}`,
    `    at singleFetchAction (${process.cwd()}/node_modules/react-router/dist/development/chunk-H4DAEOV7.mjs:867:31)`,
  ].join("\n")
  return error
}

describe("describeFailure", () => {
  describe("react-router's CSRF check", () => {
    it.each(["PUT", "PATCH", "DELETE"])("checks a %s too", (method) => {
      const request = new Request("http://positivparty.com/pagamento/abc", {
        method,
        headers: { origin: "https://evil.example" },
      })

      expect(
        failureOf(frameworkError("Bad Request"), request, "/pagamento/abc").status,
      ).toBe(400)
    })

    it("names a mismatched Origin behind a bare Bad Request", () => {
      const request = post(
        "http://positivparty.com/pagamento/abc.data",
        "https://evil.example",
      )

      expect(
        failureOf(frameworkError("Bad Request"), request, "/pagamento/abc"),
      ).toEqual({
        status: 400,
        summary:
          "POST /pagamento/abc rejected with 400 before the action ran: Origin https://evil.example does not match request URL http://positivparty.com (react-router CSRF check)",
      })
    })

    it("names it from the document request's own message", () => {
      const request = post(
        "http://positivparty.com/pagamento/abc",
        "https://evil.example",
      )
      const error = frameworkError(
        "The `request.url` origin does not match `origin` header from a forwarded action request. Aborting the action.",
      )

      expect(failureOf(error, request, "/pagamento/abc").summary).toBe(
        "POST /pagamento/abc rejected with 400 before the action ran: Origin https://evil.example does not match request URL http://positivparty.com (react-router CSRF check)",
      )
    })

    it("names an Origin that is not a URL", () => {
      const request = post("http://positivparty.com/pagamento/abc", "::nope")
      const error = frameworkError(
        "`origin` header is not a valid URL. Aborting the action.",
      )

      expect(failureOf(error, request, "/pagamento/abc")).toEqual({
        status: 400,
        summary:
          "POST /pagamento/abc rejected with 400 before the action ran: Origin ::nope is not a valid URL (react-router CSRF check)",
      })
    })

    it("does not blame the Origin when it matches", () => {
      const request = post(
        "https://positivparty.com/pagamento/abc",
        "https://positivparty.com",
      )

      expect(
        failureOf(frameworkError("Bad Request"), request, "/pagamento/abc"),
      ).toEqual({
        status: 500,
        summary: "POST /pagamento/abc failed with 500: Error: Bad Request",
      })
    })

    it("does not blame the Origin for a Bad Request the app threw", () => {
      const request = post(
        "http://positivparty.com/pagamento/abc",
        "https://evil.example",
      )

      expect(
        failureOf(new Error("Bad Request"), request, "/pagamento/abc"),
      ).toEqual({
        status: 500,
        summary: "POST /pagamento/abc failed with 500: Error: Bad Request",
      })
    })

    it("does not blame the Origin on a GET", () => {
      const request = new Request("http://positivparty.com/eventos", {
        headers: { origin: "https://evil.example" },
      })

      expect(
        failureOf(frameworkError("Bad Request"), request, "/eventos").status,
      ).toBe(500)
    })
  })

  it("says what failed for an ordinary error", () => {
    const request = new Request("http://localhost/eventos/abc")

    expect(
      failureOf(new TypeError("x is undefined"), request, "/eventos/abc"),
    ).toEqual({
      status: 500,
      summary: "GET /eventos/abc failed with 500: TypeError: x is undefined",
    })
  })

  it.each([
    ["a Response", new Response(null, { status: 503 }), 503],
    [
      "a route error response",
      new ErrorResponseImpl(502, "Bad Gateway", null),
      502,
    ],
    ["a data() value", data({ ok: false }, { status: 504 }), 504],
  ])("takes the status from %s", (_, error, status) => {
    const request = new Request("http://localhost/eventos")

    expect(failureOf(error, request, "/eventos").status).toBe(status)
  })

  it("does not take a status from an upstream error's own field", () => {
    const request = new Request("http://localhost/eventos")
    const error = Object.assign(new Error("Unauthorized"), { status: 401 })

    expect(failureOf(error, request, "/eventos").status).toBe(500)
  })
})

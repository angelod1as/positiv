import { UNSAFE_ErrorResponseImpl as ErrorResponseImpl } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { logger } from "~/lib/logger/logger.server"

const applyDraftCacheControl = vi.hoisted(() => vi.fn())

vi.mock("./business/cms/draft-mode.server", () => ({ applyDraftCacheControl }))

vi.mock("~/lib/logger/logger.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/logger/logger.server")>()),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("react-dom/server", () => ({
  renderToPipeableStream: vi.fn((_node, options: Record<string, () => void>) => {
    options.onShellReady?.()
    return { pipe: vi.fn(), abort: vi.fn() }
  }),
}))

vi.mock("@react-router/node", () => ({
  createReadableStreamFromReadable: () => null,
}))

import handleRequest, { handleDataRequest, handleError } from "./entry.server"

describe("handleDataRequest", () => {
  it("applies the draft cache-control rule to data responses", async () => {
    const response = new Response("{}")
    const request = new Request("http://localhost/_root.data")

    const result = await handleDataRequest(response, { request })

    expect(applyDraftCacheControl).toHaveBeenCalledWith(
      request,
      response.headers,
    )
    expect(result).toBe(response)
  })
})

describe("handleError", () => {
  afterEach(() => {
    vi.mocked(logger.error).mockClear()
  })

  it("reports a render error through the logger", () => {
    const error = new Error("render blew up")
    const request = new Request("http://localhost/")

    handleError(error, { request, params: {}, context: {} } as never)

    expect(logger.error).toHaveBeenCalledWith(
      "GET / failed with 500: Error: render blew up",
      expect.objectContaining({
        status: 500,
        error: {
          name: "Error",
          message: "render blew up",
          stack: expect.any(String),
        },
      }),
    )
  })

  it("tags the alert as unhandled, with the area and the masked request", () => {
    const request = new Request(
      "http://localhost/convite/tok_123abc?ref=secret",
      { headers: { "user-agent": "Mozilla/5.0 Firefox/131.0" } },
    )

    handleError(new Error("boom"), {
      request,
      params: { token: "tok_123abc" },
      context: {},
    } as never)

    expect(logger.error).toHaveBeenCalledWith(
      "GET /convite/*** failed with 500: Error: boom",
      expect.objectContaining({
        category: "unhandled",
        area: "convite",
        request: {
          method: "GET",
          path: "/convite/***",
          params: { token: "***" },
          userAgent: "Firefox",
        },
      }),
    )
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls[0])).not.toMatch(
      /tok_123abc|secret/,
    )
  })

  it("ignores an aborted request", () => {
    const error = new Error("client went away")
    // A real Request rejects a signal from this realm's AbortController
    // ("Expected signal to be an instance of AbortSignal") under undici here,
    // and handleError only reads request.signal.aborted, so stub it.
    const request = { signal: { aborted: true } }

    handleError(error, { request, params: {}, context: {} } as never)

    expect(logger.error).not.toHaveBeenCalled()
  })

  it.each([
    [405, "Method Not Allowed", "OPTIONS"],
    [404, "Not Found", "GET"],
  ])("does not log a %i route response", (status, statusText, method) => {
    const request = new Request("http://localhost/", { method })

    handleError(new ErrorResponseImpl(status, statusText, null), {
      request,
      params: {},
      context: {},
    } as never)

    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("still reports a 500 route response as unhandled", () => {
    const request = new Request("http://localhost/")

    handleError(new ErrorResponseImpl(500, "Internal Server Error", null), {
      request,
      params: {},
      context: {},
    } as never)

    expect(logger.error).toHaveBeenCalledWith(
      "GET / failed with 500: ErrorResponse 500 Internal Server Error",
      expect.objectContaining({ category: "unhandled", status: 500 }),
    )
  })

  describe("a framework-raised error", () => {
    // What react-router 7.18's single fetch hands over when its CSRF check
    // rejects an action: a bare error whose stack never reaches app code.
    function bareBadRequest() {
      const error = new Error("Bad Request")
      error.stack = [
        "Error: Bad Request",
        `    at singleFetchAction (${process.cwd()}/node_modules/react-router/dist/development/chunk-H4DAEOV7.mjs:867:31)`,
      ].join("\n")
      return error
    }

    function csrfRejectedPost() {
      return new Request("http://positivparty.com/pagamento/pay-1.data", {
        method: "POST",
        headers: {
          origin: "https://positivparty.com",
          host: "positivparty.com",
          "x-forwarded-proto": "https",
          cookie: "sb-access-token=cookie-secret",
          authorization: "Bearer auth-secret",
        },
      })
    }

    it("names the cause of today's 400 without reading code", () => {
      handleError(bareBadRequest(), {
        request: csrfRejectedPost(),
        params: { id: "pay-1" },
        context: {},
      } as never)

      expect(logger.error).toHaveBeenCalledWith(
        "POST /pagamento/pay-1 rejected with 400 before the action ran: Origin https://positivparty.com does not match request URL http://positivparty.com (react-router CSRF check)",
        expect.objectContaining({ category: "unhandled", status: 400 }),
      )
    })

    it("attaches the request facts that explain it, and no secret", () => {
      handleError(bareBadRequest(), {
        request: csrfRejectedPost(),
        params: { id: "pay-1" },
        context: {},
      } as never)

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          requestFacts: {
            method: "POST",
            url: "http://positivparty.com/pagamento/pay-1",
            origin: "https://positivparty.com",
            host: "positivparty.com",
            xForwardedProto: "https",
          },
        }),
      )
      expect(JSON.stringify(vi.mocked(logger.error).mock.calls[0])).not.toMatch(
        /secret/,
      )
    })

    it("leaves the request facts out when the stack reaches app code", () => {
      handleError(new Error("boom"), {
        request: csrfRejectedPost(),
        params: {},
        context: {},
      } as never)

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.objectContaining({ requestFacts: expect.anything() }),
      )
    })
  })
})

describe("handleRequest", () => {
  it("applies the draft cache-control rule to the document response", async () => {
    applyDraftCacheControl.mockImplementation(
      async (_request: Request, headers: Headers) => {
        headers.set("Cache-Control", "private, no-store")
      },
    )
    const request = new Request("http://localhost/")
    const responseHeaders = new Headers()

    const response = (await handleRequest(
      request,
      200,
      responseHeaders,
      { isSpaMode: false } as never,
      {} as never,
    )) as Response

    expect(applyDraftCacheControl).toHaveBeenCalledWith(request, responseHeaders)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
  })
})

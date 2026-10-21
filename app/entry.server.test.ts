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
      "Unhandled server error",
      expect.objectContaining({
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
      "Unhandled server error",
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

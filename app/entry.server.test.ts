import { afterEach, describe, expect, it, vi } from "vitest"

import { logger } from "~/lib/logger/logger.server"

const applyDraftCacheControl = vi.hoisted(() => vi.fn())

vi.mock("./business/cms/draft-mode.server", () => ({ applyDraftCacheControl }))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeError: (error: unknown) =>
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) },
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

    expect(logger.error).toHaveBeenCalledWith("Unhandled server error", {
      error: { message: "render blew up", stack: expect.any(String) },
    })
  })

  it("ignores an aborted request", () => {
    const error = new Error("client went away")
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

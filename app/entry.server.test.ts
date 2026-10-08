import { describe, expect, it, vi } from "vitest"

const applyDraftCacheControl = vi.hoisted(() => vi.fn())

vi.mock("./business/cms/draft-mode.server", () => ({ applyDraftCacheControl }))

vi.mock("react-dom/server", () => ({
  renderToPipeableStream: vi.fn((_node, options: Record<string, () => void>) => {
    options.onShellReady?.()
    return { pipe: vi.fn(), abort: vi.fn() }
  }),
}))

vi.mock("@react-router/node", () => ({
  createReadableStreamFromReadable: () => null,
}))

import handleRequest, { handleDataRequest } from "./entry.server"

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

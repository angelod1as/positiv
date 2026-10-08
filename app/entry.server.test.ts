import { describe, expect, it, vi } from "vitest"

const applyDraftCacheControl = vi.hoisted(() => vi.fn())

vi.mock("./business/cms/draft-mode.server", () => ({ applyDraftCacheControl }))

import { handleDataRequest } from "./entry.server"

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

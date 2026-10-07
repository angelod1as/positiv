import { beforeEach, describe, expect, it, vi } from "vitest"

const disableDraftMode = vi.hoisted(() => vi.fn())

vi.mock("~/business/cms/draft-mode.server", () => ({ disableDraftMode }))

import { loader } from "./disable"

beforeEach(() => {
  vi.clearAllMocks()
  disableDraftMode.mockResolvedValue("__sanity_preview=; Max-Age=0; Path=/")
})

describe("the disable-preview route", () => {
  it("clears the draft cookie and redirects home by default", async () => {
    const request = new Request("http://localhost/api/preview-mode/disable")

    const response = await loader({ request } as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("Location")).toBe("/")
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0")
  })

  it("honours the redirect query parameter", async () => {
    const request = new Request(
      "http://localhost/api/preview-mode/disable?redirect=/sobre",
    )

    const response = await loader({ request } as never)

    expect(response.headers.get("Location")).toBe("/sobre")
  })
})

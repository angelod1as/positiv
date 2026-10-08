import { beforeEach, describe, expect, it, vi } from "vitest"

const env = vi.hoisted<Record<string, unknown>>(() => ({}))
const validatePreviewUrl = vi.hoisted(() => vi.fn())
const createDraftReadClient = vi.hoisted(() => vi.fn())
const enableDraftMode = vi.hoisted(() => vi.fn())

vi.mock("varlock/env", () => ({ ENV: env }))
vi.mock("@sanity/preview-url-secret", () => ({ validatePreviewUrl }))
vi.mock("~/business/cms/draft-read-client.server", () => ({
  createDraftReadClient,
}))
vi.mock("~/business/cms/draft-mode.server", () => ({ enableDraftMode }))

import { loader } from "./enable"

function requestFor(url = "http://localhost/api/preview-mode/enable?x=1") {
  return new Request(url)
}

beforeEach(() => {
  vi.clearAllMocks()
  env.SANITY_VIEWER_TOKEN = "viewer-token"
  env.COOKIE_SECRET = "cookie-secret"
  createDraftReadClient.mockReturnValue({ withConfig: vi.fn() })
  enableDraftMode.mockResolvedValue("__sanity_preview=signed; Path=/; HttpOnly")
})

describe("the enable-preview handshake", () => {
  it("refuses with 500 when the viewer token is not configured", async () => {
    env.SANITY_VIEWER_TOKEN = undefined

    const response = await loader({ request: requestFor() } as never)

    expect(response.status).toBe(500)
    expect(validatePreviewUrl).not.toHaveBeenCalled()
  })

  it("refuses with 500 when the cookie secret is missing, before touching the secret", async () => {
    env.COOKIE_SECRET = undefined

    const response = await loader({ request: requestFor() } as never)

    expect(response.status).toBe(500)
    expect(validatePreviewUrl).not.toHaveBeenCalled()
  })

  it("rejects an invalid preview URL with 401 and sets no cookie", async () => {
    validatePreviewUrl.mockResolvedValue({ isValid: false })

    const response = await loader({ request: requestFor() } as never)

    expect(response.status).toBe(401)
    expect(response.headers.get("Set-Cookie")).toBeNull()
    expect(enableDraftMode).not.toHaveBeenCalled()
  })

  it("sets the draft cookie and redirects on a valid secret", async () => {
    validatePreviewUrl.mockResolvedValue({ isValid: true, redirectTo: "/sobre" })

    const response = await loader({ request: requestFor() } as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("Location")).toBe("/sobre")
    expect(response.headers.get("Set-Cookie")).toContain("__sanity_preview=")
  })

  it("redirects home when the secret names no destination", async () => {
    validatePreviewUrl.mockResolvedValue({ isValid: true })

    const response = await loader({ request: requestFor() } as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("Location")).toBe("/")
  })
})

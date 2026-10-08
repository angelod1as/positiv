import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  applyDraftCacheControl,
  disableDraftMode,
  enableDraftMode,
  isDraftModeEnabled,
} from "./draft-mode.server"

const env = vi.hoisted<Record<string, unknown>>(() => ({
  APP_ENV: "test",
  COOKIE_SECRET: "test-secret",
  SANITY_VIEWER_TOKEN: "viewer-token",
}))

vi.mock("varlock/env", () => ({ ENV: env }))

beforeEach(() => {
  env.APP_ENV = "test"
  env.COOKIE_SECRET = "test-secret"
  env.SANITY_VIEWER_TOKEN = "viewer-token"
})

function cookieFrom(setCookie: string): string {
  return setCookie.split(";")[0]
}

function requestWith(cookie: string): Request {
  return new Request("http://localhost/", { headers: { Cookie: cookie } })
}

describe("isDraftModeEnabled", () => {
  it("is off when the request carries no cookie", async () => {
    expect(await isDraftModeEnabled(new Request("http://localhost/"))).toBe(
      false,
    )
  })

  it("is on once the draft-mode cookie is set", async () => {
    const setCookie = await enableDraftMode(new Request("http://localhost/"))

    expect(
      await isDraftModeEnabled(requestWith(cookieFrom(setCookie))),
    ).toBe(true)
  })

  it("is off without the viewer token, even with a valid cookie", async () => {
    const cookie = cookieFrom(
      await enableDraftMode(new Request("http://localhost/")),
    )
    env.SANITY_VIEWER_TOKEN = undefined

    expect(await isDraftModeEnabled(requestWith(cookie))).toBe(false)
  })

  it("is off again after the cookie is destroyed", async () => {
    const enabled = cookieFrom(await enableDraftMode(new Request("http://localhost/")))
    const cleared = cookieFrom(
      await disableDraftMode(requestWith(enabled)),
    )

    expect(await isDraftModeEnabled(requestWith(cleared))).toBe(false)
  })
})

describe("the draft-mode cookie", () => {
  it("is signed, so a forged value does not enable draft mode", async () => {
    expect(await isDraftModeEnabled(requestWith("__sanity_preview=draft"))).toBe(
      false,
    )
  })

  it("is a session cookie that http-only hides from scripts", async () => {
    const setCookie = await enableDraftMode(new Request("http://localhost/"))

    expect(setCookie).toContain("__sanity_preview=")
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).not.toMatch(/Max-Age/i)
    expect(setCookie).not.toMatch(/Expires/i)
  })
})

describe("applyDraftCacheControl", () => {
  it("marks a draft response uncacheable", async () => {
    const cookie = cookieFrom(
      await enableDraftMode(new Request("http://localhost/")),
    )
    const headers = new Headers()

    await applyDraftCacheControl(requestWith(cookie), headers)

    expect(headers.get("Cache-Control")).toBe("private, no-store")
  })

  it("leaves a visitor response cacheable", async () => {
    const headers = new Headers()

    await applyDraftCacheControl(new Request("http://localhost/"), headers)

    expect(headers.get("Cache-Control")).toBeNull()
  })
})

describe("without a cookie secret", () => {
  it("never reports draft mode, even with a cookie present", async () => {
    const setCookie = await enableDraftMode(new Request("http://localhost/"))
    env.COOKIE_SECRET = ""

    expect(
      await isDraftModeEnabled(requestWith(cookieFrom(setCookie))),
    ).toBe(false)
  })

  it("refuses to enable draft mode", async () => {
    env.COOKIE_SECRET = ""

    await expect(
      enableDraftMode(new Request("http://localhost/")),
    ).rejects.toThrow()
  })
})

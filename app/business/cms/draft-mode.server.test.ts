import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  disableDraftMode,
  enableDraftMode,
  isDraftModeEnabled,
} from "./draft-mode.server"

const env = vi.hoisted<Record<string, unknown>>(() => ({
  APP_ENV: "test",
  COOKIE_SECRET: "test-secret",
}))

vi.mock("varlock/env", () => ({ ENV: env }))

beforeEach(() => {
  env.APP_ENV = "test"
  env.COOKIE_SECRET = "test-secret"
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

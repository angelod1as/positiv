import { beforeEach, describe, expect, it, vi } from "vitest"
import { ENV } from "varlock/env"
import { appOrigin } from "./app-origin"

vi.mock("varlock/env", () => ({ ENV: { APP_URL: "", APP_ENV: "development" } }))

const configured = (url: string) => {
  ;(ENV as { APP_URL: string }).APP_URL = url
}

const runningIn = (env: string) => {
  ;(ENV as { APP_ENV: string }).APP_ENV = env
}

describe("appOrigin", () => {
  beforeEach(() => {
    configured("")
    runningIn("development")
  })

  it("uses the url the app was told it is served from", () => {
    configured("https://positiv.com.br")

    expect(appOrigin("positiv.com.br")).toBe("https://positiv.com.br")
  })

  it("ignores the Host header when there is a configured url", () => {
    // The header is whatever the request said it was. A reset link built from
    // it can be pointed at someone else's server by asking for it from there.
    configured("https://positiv.com.br")

    expect(appOrigin("evil.example.com")).toBe("https://positiv.com.br")
  })

  it("drops a trailing slash, so a path can be appended to it", () => {
    configured("https://positiv.com.br/")

    expect(`${appOrigin("positiv.com.br")}/auth/confirm`).toBe(
      "https://positiv.com.br/auth/confirm",
    )
  })

  it("falls back to the Host header, for a machine with nothing configured", () => {
    expect(appOrigin("localhost:5173")).toBe("http://localhost:5173")
    expect(appOrigin("positiv.com.br")).toBe("https://positiv.com.br")
  })

  it("leaves a host that already carries its scheme alone", () => {
    expect(appOrigin("http://localhost:5173")).toBe("http://localhost:5173")
    expect(appOrigin("https://positiv.com.br/")).toBe("https://positiv.com.br")
  })

  it("still answers with the configured url in production", () => {
    // The ordinary, correctly configured production case, and the one the two
    // checks below could silently swap places on: a reordering that put the
    // production check first would return nothing here, and every e-mail link
    // production sends would quietly stop working.
    configured("https://positiv.com.br")
    runningIn("production")

    expect(appOrigin("evil.example.com")).toBe("https://positiv.com.br")
    expect(appOrigin(null)).toBe("https://positiv.com.br")
  })

  it("refuses the Host header in production, where nothing should trust it", () => {
    // Production has no business reading an origin off the request. Without a
    // configured url the link is built from whatever the caller said the host
    // was, and it arrives in the mailbox looking exactly as legitimate as any
    // other. A reset link that goes nowhere is a bug; one that goes to somebody
    // else's server is an account takeover.
    runningIn("production")

    expect(appOrigin("evil.example.com")).toBe("")
    expect(appOrigin("positiv.com.br")).toBe("")
  })

  it("answers with nothing it could not build an origin from", () => {
    expect(appOrigin(null)).toBe("")
    expect(appOrigin(undefined)).toBe("")
  })
})

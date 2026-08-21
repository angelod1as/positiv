import { beforeEach, describe, expect, it, vi } from "vitest"
import { ENV } from "varlock/env"
import { appOrigin } from "./app-origin"

vi.mock("varlock/env", () => ({ ENV: { APP_URL: "" } }))

const configured = (url: string) => {
  ;(ENV as { APP_URL: string }).APP_URL = url
}

describe("appOrigin", () => {
  beforeEach(() => {
    configured("")
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

  it("answers with nothing it could not build an origin from", () => {
    expect(appOrigin(null)).toBe("")
    expect(appOrigin(undefined)).toBe("")
  })
})

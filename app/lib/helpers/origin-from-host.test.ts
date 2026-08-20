import { describe, expect, it } from "vitest"
import { originFromHost } from "./origin-from-host"

describe("originFromHost", () => {
  it("makes an origin out of a bare Host header", () => {
    expect(originFromHost("positiv.com.br")).toBe("https://positiv.com.br")
  })

  it("keeps a local host on http, where there is no certificate", () => {
    expect(originFromHost("localhost:5173")).toBe("http://localhost:5173")
  })

  it("leaves a host that already carries its scheme alone", () => {
    expect(originFromHost("https://positiv.com.br")).toBe(
      "https://positiv.com.br",
    )
    expect(originFromHost("http://localhost:5173")).toBe(
      "http://localhost:5173",
    )
  })

  it("drops a trailing slash, so a path can be appended to it", () => {
    expect(originFromHost("https://positiv.com.br/")).toBe(
      "https://positiv.com.br",
    )
    expect(`${originFromHost("localhost:5173/")}/auth/confirm`).toBe(
      "http://localhost:5173/auth/confirm",
    )
  })

  it("answers with nothing it could not build an origin from", () => {
    expect(originFromHost(null)).toBe("")
    expect(originFromHost(undefined)).toBe("")
  })
})

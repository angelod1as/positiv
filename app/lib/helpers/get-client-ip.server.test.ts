import { describe, expect, it } from "vitest"
import { getClientIp } from "./get-client-ip.server"

const requestWith = (headers: Record<string, string>) =>
  new Request("https://positivparty.com/api/auth/register", { headers })

describe("getClientIp", () => {
  it("reads the address the proxy put in X-Real-Ip", () => {
    const request = requestWith({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1, 203.0.113.9",
    })

    expect(getClientIp(request)).toBe("203.0.113.7")
  })

  it("falls back to the last X-Forwarded-For entry, the one the proxy appended", () => {
    const request = requestWith({
      "x-forwarded-for": "198.51.100.1, 203.0.113.9",
    })

    expect(getClientIp(request)).toBe("203.0.113.9")
  })

  it("trims whitespace around the address", () => {
    expect(getClientIp(requestWith({ "x-real-ip": "  203.0.113.7 " }))).toBe(
      "203.0.113.7",
    )
    expect(
      getClientIp(
        requestWith({ "x-forwarded-for": "198.51.100.1 ,  203.0.113.9 " }),
      ),
    ).toBe("203.0.113.9")
  })

  it("answers null when no proxy header carries an address", () => {
    expect(getClientIp(requestWith({}))).toBeNull()
    expect(getClientIp(requestWith({ "x-real-ip": " " }))).toBeNull()
    expect(getClientIp(requestWith({ "x-forwarded-for": " , " }))).toBeNull()
  })

  it("ignores cf-connecting-ip, since nothing in front of the app sets it", () => {
    expect(
      getClientIp(requestWith({ "cf-connecting-ip": "198.51.100.66" })),
    ).toBeNull()
  })
})

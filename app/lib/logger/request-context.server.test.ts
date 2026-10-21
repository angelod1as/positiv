import { describe, expect, it } from "vitest"

import { requestContext } from "./request-context.server"

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

const MASK_FOR_TEST = "***"

function request(url: string, init: RequestInit = {}) {
  return new Request(url, init)
}

describe("requestContext", () => {
  it("keeps the method and the path without the query string", () => {
    const context = requestContext(
      request("http://localhost/eventos/abc?token=secret&page=2", {
        method: "POST",
      }),
      {},
    )

    expect(context.request).toMatchObject({
      method: "POST",
      path: "/eventos/abc",
    })
    expect(JSON.stringify(context)).not.toContain("secret")
  })

  it("masks a token-like param in the params and in the path", () => {
    const context = requestContext(
      request("http://localhost/convite/tok_123abc"),
      { token: "tok_123abc" },
    )

    expect(context.request.path).toBe("/convite/***")
    expect(context.request.params).toEqual({ token: "***" })
    expect(JSON.stringify(context)).not.toContain("tok_123abc")
  })

  it.each(["inviteToken", "secret", "apiKey", "code", "password", "hash"])(
    "masks a param named %s",
    (name) => {
      const context = requestContext(request("http://localhost/x/v4lue"), {
        [name]: "v4lue",
      })

      expect(context.request.params).toEqual({ [name]: "***" })
      expect(context.request.path).toBe("/x/***")
    },
  )

  it("masks the token in a single-fetch data request path", () => {
    const context = requestContext(
      request("http://localhost/convite/tok_123abc.data"),
      { token: "tok_123abc" },
    )

    expect(context.request.path).toBe("/convite/***")
  })

  it("keeps an ordinary param as it is", () => {
    const context = requestContext(request("http://localhost/eventos/42"), {
      eventId: "42",
    })

    expect(context.request.path).toBe("/eventos/42")
    expect(context.request.params).toEqual({ eventId: "42" })
  })

  it("takes the area from the first path segment", () => {
    expect(
      requestContext(request("http://localhost/admin/eventos/42"), {}).area,
    ).toBe("admin")
    expect(requestContext(request("http://localhost/conta.data"), {}).area).toBe(
      "conta",
    )
  })

  it("never takes the area from a masked segment", () => {
    const context = requestContext(request("http://localhost/tok_123abc"), {
      token: "tok_123abc",
    })

    expect(context.area).toBe(MASK_FOR_TEST)
  })

  it("leaves the area out on the home page", () => {
    expect(requestContext(request("http://localhost/"), {})).not.toHaveProperty(
      "area",
    )
  })

  it.each([
    [CHROME, "Chrome"],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
      "Firefox",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Safari",
    ],
    [`${CHROME} Edg/141.0.0.0`, "Edge"],
    ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "bot"],
    ["curl/8.7.1", "other"],
  ])("reduces the user-agent %s to its family", (userAgent, family) => {
    const context = requestContext(
      request("http://localhost/", { headers: { "user-agent": userAgent } }),
      {},
    )

    expect(context.request.userAgent).toBe(family)
  })

  it("leaves the user-agent out when there is none", () => {
    expect(
      requestContext(request("http://localhost/"), {}).request,
    ).not.toHaveProperty("userAgent")
  })
})

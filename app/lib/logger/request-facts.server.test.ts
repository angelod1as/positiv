import { describe, expect, it } from "vitest"

import { requestFacts } from "./request-facts.server"

describe("requestFacts", () => {
  it("keeps the headers that explain a rejected request", () => {
    const request = new Request("http://positivparty.com/pagamento/abc", {
      method: "POST",
      headers: {
        origin: "https://positivparty.com",
        host: "positivparty.com",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "positivparty.com",
      },
    })

    expect(requestFacts(request, "/pagamento/abc")).toEqual({
      method: "POST",
      url: "http://positivparty.com/pagamento/abc",
      origin: "https://positivparty.com",
      host: "positivparty.com",
      xForwardedProto: "https",
      xForwardedHost: "positivparty.com",
    })
  })

  it("never carries cookies, authorization or the body", () => {
    const request = new Request("http://localhost/pagamento/abc", {
      method: "POST",
      headers: {
        cookie: "sb-access-token=cookie-secret",
        authorization: "Bearer auth-secret",
        "x-api-key": "key-secret",
      },
      body: "cpf=body-secret",
    })

    const facts = requestFacts(request, "/pagamento/abc")

    expect(JSON.stringify(facts)).not.toMatch(/secret/)
    expect(Object.keys(facts).sort()).toEqual(["method", "url"])
  })

  it("uses the masked path and drops the query string from the URL", () => {
    const request = new Request(
      "http://localhost/convite/tok_123abc?ref=secret",
    )

    const facts = requestFacts(request, "/convite/***")

    expect(facts.url).toBe("http://localhost/convite/***")
    expect(JSON.stringify(facts)).not.toMatch(/tok_123abc|secret/)
  })

  it("redacts and caps a header value", () => {
    const request = new Request("http://localhost/", {
      headers: {
        origin: `https://someone@example.com/${"a".repeat(500)}`,
      },
    })

    const { origin } = requestFacts(request, "/")

    expect(origin).not.toContain("someone@")
    expect(origin?.length).toBeLessThanOrEqual(203)
  })
})

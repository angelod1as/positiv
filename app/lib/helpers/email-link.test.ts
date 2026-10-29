import { describe, expect, it } from "vitest"
import { emailLink } from "./email-link"

describe("emailLink", () => {
  it("adds the three UTM parameters to a link without a query", () => {
    expect(
      emailLink("https://www.positivparty.com/dashboard", {
        medium: "transactional",
        campaign: "payment-confirmed",
      }),
    ).toBe(
      "https://www.positivparty.com/dashboard?utm_source=email&utm_medium=transactional&utm_campaign=payment-confirmed",
    )
  })

  it("keeps an existing query and appends the UTMs after it", () => {
    expect(
      emailLink("https://www.positivparty.com/eventos?tipo=festa", {
        medium: "newsletter",
        campaign: "event-opening",
      }),
    ).toBe(
      "https://www.positivparty.com/eventos?tipo=festa&utm_source=email&utm_medium=newsletter&utm_campaign=event-opening",
    )
  })

  it("encodes the campaign", () => {
    expect(
      emailLink("https://www.positivparty.com/", {
        medium: "newsletter",
        campaign: "festa de verão",
      }),
    ).toBe(
      "https://www.positivparty.com/?utm_source=email&utm_medium=newsletter&utm_campaign=festa+de+ver%C3%A3o",
    )
  })

  it("puts the UTMs before a fragment", () => {
    expect(
      emailLink("https://www.positivparty.com/eventos?tipo=festa#proximos", {
        medium: "newsletter",
        campaign: "default",
      }),
    ).toBe(
      "https://www.positivparty.com/eventos?tipo=festa&utm_source=email&utm_medium=newsletter&utm_campaign=default#proximos",
    )
  })

  it("does not throw on a link without a scheme", () => {
    expect(
      emailLink("/pagamento/123", {
        medium: "transactional",
        campaign: "payment-link",
      }),
    ).toBe(
      "/pagamento/123?utm_source=email&utm_medium=transactional&utm_campaign=payment-link",
    )
  })
})

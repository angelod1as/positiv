import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithRouter } from "~/test/test-utils"
import { PaymentBetaNotice } from "./payment-beta-notice"

describe("PaymentBetaNotice", () => {
  it("warns that the payment system is new and still being tested", () => {
    renderWithRouter(<PaymentBetaNotice eventTitle="Encontro de Maio" />)

    expect(screen.getByText(/O sistema de pagamento é novo e ainda está em teste/)).toBeInTheDocument()
  })

  it("links to Positiv's WhatsApp with a message naming the event", () => {
    renderWithRouter(<PaymentBetaNotice eventTitle="Encontro de Maio" />)

    const link = screen.getByRole("link", { name: "WhatsApp" })
    const href = new URL(link.getAttribute("href") ?? "")

    expect(href.origin + href.pathname).toBe("https://wa.me/5511945970336")
    expect(href.searchParams.get("text")).toContain("Encontro de Maio")
  })

  // The link is Markdown, where an unbalanced parenthesis in the address ends
  // it early and leaves the rest of the title on screen.
  it("keeps the link whole when the event title carries a parenthesis", () => {
    renderWithRouter(<PaymentBetaNotice eventTitle="Festa :)" />)

    const link = screen.getByRole("link", { name: "WhatsApp" })
    const href = new URL(link.getAttribute("href") ?? "")

    expect(href.searchParams.get("text")).toContain("Festa :)")
  })
})

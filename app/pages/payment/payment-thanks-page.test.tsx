import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithRouter } from "~/test/test-utils"
import { paymentsCopy } from "~/copy/payments"
import PaymentThanksPage from "./payment-thanks-page"
import type { PaymentThanksData } from "./payment-page.server"

// The page reads one prop of the many a route component is handed, and a test
// that built the rest would be describing React Router, not this page.
const Page = PaymentThanksPage as unknown as (props: {
  loaderData: PaymentThanksData & { betaNotice: boolean }
}) => React.ReactNode

const renderPage = (loaderData: PaymentThanksData, betaNotice = false) =>
  renderWithRouter(<Page loaderData={{ ...loaderData, betaNotice }} />)

describe("PaymentThanksPage", () => {
  it("says so when the payment has already landed", () => {
    renderPage({
      state: "paid",
      eventTitle: "Encontro de Maio",
      amount: 22199,
      paidAt: "2026-08-20T12:00:00Z",
    })

    expect(
      screen.getByText(paymentsCopy.page.thanksPaidTitle),
    ).toBeInTheDocument()
    expect(
      screen.getByText(paymentsCopy.page.thanksPaidBody),
    ).toBeInTheDocument()
  })

  it("says the confirmation is on its way while the payment is still in flight", () => {
    renderPage({ state: "waiting", eventTitle: "Encontro de Maio" })

    expect(screen.getByText(paymentsCopy.page.thanksTitle)).toBeInTheDocument()
    expect(screen.getByText(paymentsCopy.page.thanksBody)).toBeInTheDocument()
  })

  // An admin cancelling the charge, or the expiry cron reaching it, between the
  // Asaas redirect and this page loading. Promising a confirmation email that
  // will never arrive is worse than saying nothing.
  it("does not promise a confirmation for a link that has closed", () => {
    renderPage({ state: "closed", eventTitle: "Encontro de Maio" })

    expect(screen.getByText(paymentsCopy.page.closedTitle)).toBeInTheDocument()
    expect(screen.getByText(paymentsCopy.page.closedBody)).toBeInTheDocument()
    expect(
      screen.queryByText(paymentsCopy.page.thanksBody),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(paymentsCopy.page.thanksPaidTitle),
    ).not.toBeInTheDocument()
  })

  // Asaas sends the participant here the moment they finish on its side, which
  // is before the money is confirmed. Only the webhook may mark a row paid.
  it("offers no way to pay and claims nothing about the money", () => {
    renderPage({ state: "waiting", eventTitle: "Encontro de Maio" })

    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: paymentsCopy.page.pay }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(paymentsCopy.page.thanksPaidTitle),
    ).not.toBeInTheDocument()
  })
  it("warns that online payments are new while they are on", () => {
    renderPage({ state: "waiting", eventTitle: "Encontro de Maio" }, true)

    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/5511945970336"),
    )
  })

  it("shows no beta notice while online payments are off", () => {
    renderPage({ state: "waiting", eventTitle: "Encontro de Maio" }, false)

    expect(
      screen.queryByRole("link", { name: "WhatsApp" }),
    ).not.toBeInTheDocument()
  })
})

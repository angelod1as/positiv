import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithRouter } from "~/test/test-utils"
import { paymentsCopy } from "~/copy/payments"
import PaymentThanksPage from "./payment-thanks-page"
import type { PaymentPageData } from "./payment-page.server"

// The page reads one prop of the many a route component is handed, and a test
// that built the rest would be describing React Router, not this page.
const Page = PaymentThanksPage as unknown as (props: {
  loaderData: PaymentPageData
}) => React.ReactNode

const renderPage = (loaderData: PaymentPageData) =>
  renderWithRouter(<Page loaderData={loaderData} />)

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
    renderPage({
      state: "ready",
      paymentId: "payment-1",
      eventTitle: "Encontro de Maio",
      eventEmoji: "🌻",
      dueAt: "2026-09-18T12:00:00Z",
      options: [],
      chosen: null,
      invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
    })

    expect(screen.getByText(paymentsCopy.page.thanksTitle)).toBeInTheDocument()
    expect(screen.getByText(paymentsCopy.page.thanksBody)).toBeInTheDocument()
  })

  // Asaas sends the participant here the moment they finish on its side, which
  // is before the money is confirmed. Only the webhook may mark a row paid.
  it("offers no way to pay and claims nothing about the money", () => {
    renderPage({
      state: "ready",
      paymentId: "payment-1",
      eventTitle: "Encontro de Maio",
      eventEmoji: null,
      dueAt: "2026-09-18T12:00:00Z",
      options: [],
      chosen: null,
      invoiceUrl: null,
    })

    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: paymentsCopy.page.pay }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(paymentsCopy.page.thanksPaidTitle),
    ).not.toBeInTheDocument()
  })
})

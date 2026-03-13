import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    Link: ({
      children,
      to,
    }: {
      children: React.ReactNode
      to: string
    }) => <a href={to}>{children}</a>,
  }
})

vi.mock("~/components/atoms/button/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode
    to?: string
    variant?: string
  }) => (
    <a href={props.to ?? "#"} data-variant={props.variant}>
      {children}
    </a>
  ),
}))

vi.mock("~/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

import PaymentPage from "./payment"
import type { ValidatePaymentTokenResult } from "~/business/payment/validate-payment-token.server"

type LoaderData = Exclude<ValidatePaymentTokenResult, { status: "not_found" }>

function renderPaymentPage(loaderData: LoaderData) {
  return render(<PaymentPage loaderData={loaderData} />)
}

describe("PaymentPage", () => {
  describe("success with 2 payment options", () => {
    const successData: LoaderData = {
      status: "success",
      data: {
        eventTitle: "Test Event",
        eventEmoji: "🎉",
        participantName: "Test User",
        paymentOptions: [
          {
            method: "pix",
            amount: 22_000,
            invoiceUrl: "https://asaas.com/i/pix-123",
          },
          {
            method: "credit_card",
            amount: 22_700,
            invoiceUrl: "https://asaas.com/i/cc-456",
            installments: 6,
          },
        ],
      },
    }

    it("renders event title with emoji", () => {
      renderPaymentPage(successData)

      expect(screen.getByText(/Test Event/)).toBeInTheDocument()
      expect(screen.getByText(/🎉/)).toBeInTheDocument()
    })

    it("renders participant name", () => {
      renderPaymentPage(successData)

      expect(screen.getByText(/Test User/)).toBeInTheDocument()
    })

    it("renders Pix option with correct amount", () => {
      renderPaymentPage(successData)

      expect(screen.getAllByText(/Pix/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/220,00/)).toBeInTheDocument()
    })

    it("renders credit card option with correct amount and installments", () => {
      renderPaymentPage(successData)

      expect(screen.getAllByText(/Cartão de crédito/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/227,00/)).toBeInTheDocument()
      expect(screen.getByText(/6x/)).toBeInTheDocument()
    })

    it("renders payment links pointing to invoice URLs", () => {
      renderPaymentPage(successData)

      const links = screen.getAllByRole("link")
      const pixLink = links.find((l) => l.getAttribute("href") === "https://asaas.com/i/pix-123")
      const ccLink = links.find((l) => l.getAttribute("href") === "https://asaas.com/i/cc-456")

      expect(pixLink).toBeInTheDocument()
      expect(ccLink).toBeInTheDocument()
    })
  })

  describe("success with 1 payment option", () => {
    it("renders only the available payment option", () => {
      renderPaymentPage({
        status: "success",
        data: {
          eventTitle: "Test Event",
          eventEmoji: "🎉",
          participantName: "Test User",
          paymentOptions: [
            {
              method: "pix",
              amount: 22_000,
              invoiceUrl: "https://asaas.com/i/pix-123",
            },
          ],
        },
      })

      expect(screen.getAllByText(/Pix/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/220,00/)).toBeInTheDocument()
      expect(screen.queryByText(/Cartão de crédito/i)).not.toBeInTheDocument()
    })
  })

  describe("expired status", () => {
    it("renders expired message with event info", () => {
      renderPaymentPage({
        status: "expired",
        data: { eventTitle: "Test Event", eventEmoji: "🎉" },
      })

      expect(screen.getByText(/expirou/i)).toBeInTheDocument()
      expect(screen.getByText(/Test Event/)).toBeInTheDocument()
    })
  })

  describe("already_paid status", () => {
    it("renders already paid message", () => {
      renderPaymentPage({
        status: "already_paid",
        data: { eventTitle: "Test Event", eventEmoji: "🎉" },
      })

      expect(screen.getByText(/já foi confirmado/i)).toBeInTheDocument()
    })
  })

  describe("no_valid_charges status", () => {
    it("renders no valid charges message", () => {
      renderPaymentPage({
        status: "no_valid_charges",
        data: { eventTitle: "Test Event", eventEmoji: "🎉" },
      })

      expect(screen.getByText(/não há opções de pagamento/i)).toBeInTheDocument()
    })
  })
})

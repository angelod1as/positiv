import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    Form: ({
      children,
      method,
      ...props
    }: {
      children: React.ReactNode
      method?: string
      [key: string]: unknown
    }) => (
      <form method={method} data-testid="payment-form" {...props}>
        {children}
      </form>
    ),
    useActionData: vi.fn().mockReturnValue(undefined),
    useNavigation: vi.fn().mockReturnValue({ state: "idle" }),
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
    linkProps,
    ...props
  }: {
    children: React.ReactNode
    to?: string
    variant?: string
    type?: "button" | "submit" | "reset"
    disabled?: boolean
    linkProps?: Record<string, string>
  }) => {
    if (props.to) {
      return (
        <a href={props.to} data-variant={props.variant} {...linkProps}>
          {children}
        </a>
      )
    }
    return (
      <button type={props.type} disabled={props.disabled} data-variant={props.variant}>
        {children}
      </button>
    )
  },
}))

vi.mock("~/components/ui/card", () => ({
  Card: ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
    <div data-testid="card" className={className} {...props}>{children}</div>
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

vi.mock("~/components/ui/label", () => ({
  Label: ({ children, htmlFor, ...props }: { children: React.ReactNode; htmlFor?: string; [key: string]: unknown }) => (
    <label htmlFor={htmlFor} {...props}>{children}</label>
  ),
}))

vi.mock("~/components/ui/radio-group", () => {
  let groupOnValueChange: ((value: string) => void) | undefined

  return {
    RadioGroup: ({ children, onValueChange, value, ...props }: {
      children: React.ReactNode
      onValueChange?: (value: string) => void
      value?: string
      [key: string]: unknown
    }) => {
      groupOnValueChange = onValueChange
      return (
        <div role="radiogroup" data-value={value} {...props}>
          {children}
        </div>
      )
    },
    RadioGroupItem: ({ value, id, ...props }: { value: string; id?: string; [key: string]: unknown }) => (
      <input
        type="radio"
        name="method"
        value={value}
        id={id}
        onChange={() => groupOnValueChange?.(value)}
        {...props}
      />
    ),
  }
})

vi.mock("~/components/ui/select", () => ({
  Select: ({ children, onValueChange, value, ...props }: {
    children: React.ReactNode
    onValueChange?: (value: string) => void
    value?: string
    [key: string]: unknown
  }) => <div data-testid="select" {...props}>{children}</div>,
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" data-testid="select-trigger" {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`} data-value={value}>{children}</div>
  ),
}))

import PaymentPage from "./payment"
import type { ValidatePaymentTokenResult } from "~/business/payment/validate-payment-token.server"

type LoaderData = Exclude<ValidatePaymentTokenResult, { status: "not_found" }>

function renderPaymentPage(loaderData: LoaderData) {
  return render(<PaymentPage loaderData={loaderData} />)
}

const readyData: Extract<ValidatePaymentTokenResult, { status: "ready" }> = {
  status: "ready",
  data: {
    eventTitle: "Test Event",
    eventEmoji: "\u{1F389}",
    participantName: "Test User",
    participantId: "part-1",
    profileId: "prof-1",
    eventId: "evt-1",
    cpf: "123.456.789-00",
    email: "test@example.com",
    fullName: "Test User",
    socialName: null,
  },
}

describe("PaymentPage", () => {
  describe("ready status - interactive form", () => {
    it("renders event title with emoji", () => {
      renderPaymentPage(readyData)

      expect(screen.getByText(/Test Event/)).toBeInTheDocument()
      expect(screen.getByText(/\u{1F389}/u)).toBeInTheDocument()
    })

    it("renders participant greeting", () => {
      renderPaymentPage(readyData)

      expect(screen.getByText(/Test User/)).toBeInTheDocument()
    })

    it("renders payment method selection with Pix and Credit Card options", () => {
      renderPaymentPage(readyData)

      expect(screen.getByText(/Pix/)).toBeInTheDocument()
      expect(screen.getByText(/Cartão de crédito/i)).toBeInTheDocument()
    })

    it("renders a submit button", () => {
      renderPaymentPage(readyData)

      expect(screen.getByRole("button", { name: /pagar/i })).toBeInTheDocument()
    })

    it("renders a form element for submission", () => {
      renderPaymentPage(readyData)

      expect(screen.getByTestId("payment-form")).toBeInTheDocument()
    })

    it("displays Pix price (R$ 220,00) when Pix is selected", async () => {
      const user = userEvent.setup()
      renderPaymentPage(readyData)

      const pixRadio = screen.getByLabelText(/Pix/i)
      await user.click(pixRadio)

      expect(screen.getByText(/220,00/)).toBeInTheDocument()
    })

    it("shows installment select when credit card is selected", async () => {
      const user = userEvent.setup()
      renderPaymentPage(readyData)

      const ccRadio = screen.getByLabelText(/Cartão de crédito/i)
      await user.click(ccRadio)

      expect(screen.getByTestId("select")).toBeInTheDocument()
    })
  })

  describe("expired status", () => {
    it("renders expired message with event info", () => {
      renderPaymentPage({
        status: "expired",
        data: { eventTitle: "Test Event", eventEmoji: "\u{1F389}" },
      })

      expect(screen.getByText(/expirou/i)).toBeInTheDocument()
      expect(screen.getByText(/Test Event/)).toBeInTheDocument()
    })
  })

  describe("already_paid status", () => {
    it("renders already paid message", () => {
      renderPaymentPage({
        status: "already_paid",
        data: { eventTitle: "Test Event", eventEmoji: "\u{1F389}" },
      })

      expect(screen.getByText(/já foi confirmado/i)).toBeInTheDocument()
    })
  })
})

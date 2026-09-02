import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PaymentRow } from "~/business/payment/payment-totals.server"
import { render, screen, within } from "~/test/test-utils"
import { ManagePaymentModal } from "./manage-payment-modal"

const submit = vi.fn()
let fetcherData: unknown = undefined

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useFetcher: () => ({ submit, state: "idle", data: fetcherData }),
  }
})

const payment = (overrides: Partial<PaymentRow>): PaymentRow =>
  ({
    id: "p1",
    event_participant_id: "ep-1",
    kind: "manual",
    status: "paid",
    method: "pix",
    base_amount: 22000,
    amount: 22000,
    paid_at: "2026-08-20T12:00:00Z",
    due_at: "2026-08-20T12:00:00Z",
    refund_amount: null,
    refunded_at: null,
    asaas_net: null,
    note: null,
    ...overrides,
  }) as PaymentRow

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  eventParticipantId: "ep-1",
  participantName: "Ana",
  payments: [] as PaymentRow[],
  totals: {
    paid_gross: 0,
    refunded: 0,
    fee: 0,
    net: 0,
    has_paid: false,
    current_status: null,
  },
  active: null as PaymentRow | null,
}

describe("ManagePaymentModal", () => {
  beforeEach(() => {
    submit.mockClear()
    fetcherData = undefined
  })

  it("says when there is nothing recorded", () => {
    render(<ManagePaymentModal {...baseProps} />)

    expect(screen.getByText("Nenhum pagamento registrado.")).toBeInTheDocument()
  })

  it("lists a payment with its origin, method and amount", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[payment({})]}
        totals={{
          ...baseProps.totals,
          paid_gross: 22000,
          net: 22000,
          has_paid: true,
        }}
      />,
    )

    const row = screen.getByRole("row", { name: /pix/i })
    expect(within(row).getByText("R$ 220,00")).toBeInTheDocument()
    expect(within(row).getByText("Manual")).toBeInTheDocument()
    expect(within(row).getByText("Pago")).toBeInTheDocument()
  })

  it("records a manual payment through the form", async () => {
    render(<ManagePaymentModal {...baseProps} />)

    await userEvent.type(screen.getByLabelText("Valor recebido"), "150")
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar pagamento" }),
    )

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("intent")).toBe("payment-manual")
    expect(formData.get("amount")).toBe("150")
    expect(formData.get("eventParticipantId")).toBe("ep-1")
    expect(formData.get("method")).toBe("pix")
    expect(formData.get("paidAt")).toBeTruthy()
  })

  it("only ever records a payment as pix", async () => {
    render(<ManagePaymentModal {...baseProps} />)

    expect(screen.queryByLabelText("Forma")).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Valor recebido"), "150")
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar pagamento" }),
    )

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("method")).toBe("pix")
  })

  it("does not ask for a note", () => {
    render(<ManagePaymentModal {...baseProps} />)

    expect(screen.queryByLabelText("Observação")).not.toBeInTheDocument()
  })

  it("closes itself once the payment is recorded", () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <ManagePaymentModal {...baseProps} onOpenChange={onOpenChange} />,
    )

    expect(onOpenChange).not.toHaveBeenCalled()

    fetcherData = { success: true, intent: "payment-manual" }
    rerender(<ManagePaymentModal {...baseProps} onOpenChange={onOpenChange} />)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("says why a payment was refused", () => {
    const { rerender } = render(<ManagePaymentModal {...baseProps} />)

    fetcherData = {
      success: false,
      intent: "payment-manual",
      errors: [{ message: "Informe um valor de zero ou mais." }],
    }
    rerender(<ManagePaymentModal {...baseProps} />)

    expect(
      screen.getByText("Informe um valor de zero ou mais."),
    ).toBeInTheDocument()
  })

  it("says why a refund was refused", () => {
    const { rerender } = render(
      <ManagePaymentModal {...baseProps} payments={[payment({})]} />,
    )

    fetcherData = {
      success: false,
      intent: "payment-manual-refund",
      errors: [{ message: "O reembolso não pode ser maior que o valor pago." }],
    }
    rerender(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    expect(
      screen.getByText("O reembolso não pode ser maior que o valor pago."),
    ).toBeInTheDocument()
  })

  it("falls back to a generic message when the failure carries none", () => {
    const { rerender } = render(<ManagePaymentModal {...baseProps} />)

    fetcherData = { success: false, intent: "payment-cancel" }
    rerender(<ManagePaymentModal {...baseProps} />)

    expect(
      screen.getByText("Não foi possível concluir a operação."),
    ).toBeInTheDocument()
  })

  it("stays open when the payment was refused", () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <ManagePaymentModal {...baseProps} onOpenChange={onOpenChange} />,
    )

    fetcherData = {
      success: false,
      intent: "payment-manual",
      errors: [{ message: "Informe um valor de zero ou mais." }],
    }
    rerender(<ManagePaymentModal {...baseProps} onOpenChange={onOpenChange} />)

    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("counts what was given back out of the total paid", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[
          payment({
            status: "partially_refunded",
            refund_amount: 5000,
            refunded_at: "2026-08-21T12:00:00Z",
            amount: 10000,
            base_amount: 10000,
          }),
        ]}
        totals={{
          ...baseProps.totals,
          paid_gross: 10000,
          refunded: 5000,
          fee: 1000,
          net: 4000,
          has_paid: true,
        }}
      />,
    )

    expect(screen.getByText("Total pago").closest("div")).toHaveTextContent(
      "R$ 50,00",
    )
  })

  it("records a courtesy spot settled at zero", async () => {
    render(<ManagePaymentModal {...baseProps} />)

    await userEvent.type(screen.getByLabelText("Valor recebido"), "0")
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar pagamento" }),
    )

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("amount")).toBe("0")
  })

  it("offers a refund only for a paid row", () => {
    const { rerender } = render(
      <ManagePaymentModal {...baseProps} payments={[payment({})]} />,
    )
    expect(
      screen.getByRole("button", { name: /marcar como reembolsado/i }),
    ).toBeInTheDocument()

    rerender(
      <ManagePaymentModal
        {...baseProps}
        payments={[
          payment({
            status: "refunded",
            refund_amount: 22000,
            refunded_at: "2026-08-21T12:00:00Z",
          }),
        ]}
      />,
    )
    expect(
      screen.queryByRole("button", { name: /marcar como reembolsado/i }),
    ).not.toBeInTheDocument()
  })

  it("asks before giving money back", async () => {
    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    await userEvent.click(
      screen.getByRole("button", { name: /marcar como reembolsado/i }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Marcar reembolso" }))

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("intent")).toBe("payment-manual-refund")
    expect(formData.get("paymentId")).toBe("p1")
  })

  it("offers to cancel only an open charge", async () => {
    const open = payment({
      status: "pending",
      kind: "asaas",
      amount: null,
      method: null,
      paid_at: null,
    })

    render(
      <ManagePaymentModal {...baseProps} active={open} payments={[open]} />,
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Cancelar cobrança" }),
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    )

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("intent")).toBe("payment-cancel")
    expect(formData.get("paymentId")).toBe("p1")
  })

  it("hides the manual form while a charge is open", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        active={payment({
          status: "pending",
          kind: "asaas",
          amount: null,
          method: null,
          paid_at: null,
        })}
      />,
    )

    expect(screen.queryByLabelText("Valor recebido")).not.toBeInTheDocument()
    expect(
      screen.getByText(/cancele-a antes de registrar um pagamento manual/i),
    ).toBeInTheDocument()
  })
})

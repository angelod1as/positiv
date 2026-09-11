import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FALLBACK_FEES } from "~/business/payment/asaas-fees.server"
import type { PaymentRow } from "~/business/payment/payment-totals.server"
import { render, screen, within } from "~/test/test-utils"
import { ManagePaymentModal } from "./manage-payment-modal"

const submit = vi.fn()
let fetcherData: unknown = undefined
let fetcherState = "idle"

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useFetcher: () => ({ submit, state: fetcherState, data: fetcherData }),
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
    created_at: "2026-08-20T12:00:00Z",
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
    payment_status: null,
    active_payment_id: null,
  },
  active: null as PaymentRow | null,
  paymentsEnabled: true,
  spotType: "regular" as const,
  ticketPrice: 22000,
  eventTitle: "Festa de Setembro",
  fees: FALLBACK_FEES,
}

const openCharge = payment({
  id: "open-1",
  kind: "asaas",
  status: "pending",
  method: null,
  amount: null,
  paid_at: null,
  base_amount: 22000,
  due_at: "2026-09-01T12:00:00Z",
})

describe("ManagePaymentModal", () => {
  beforeEach(() => {
    submit.mockClear()
    fetcherData = undefined
    fetcherState = "idle"
  })

  afterEach(() => {
    vi.useRealTimers()
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
          payment_status: "paid",
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

  it("does not turn the amount field into a stepper", () => {
    render(<ManagePaymentModal {...baseProps} />)

    // A spinbutton is what binds the arrow keys to a step of one cent; an admin
    // reaching for the start of the amount they typed moved the money instead.
    expect(
      screen.queryByRole("spinbutton", { name: "Valor recebido" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("textbox", { name: "Valor recebido" }),
    ).toBeInTheDocument()
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

  it("refuses a second click while a refund is in flight", async () => {
    fetcherState = "submitting"

    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    await userEvent.click(
      screen.getByRole("button", { name: /marcar como reembolsado/i }),
    )

    expect(screen.getByRole("button", { name: "Marcar reembolso" })).toBeDisabled()
  })

  it("refuses a second click while a cancellation is in flight", async () => {
    fetcherState = "submitting"
    const open = payment({
      status: "pending",
      kind: "asaas",
      amount: null,
      method: null,
      paid_at: null,
    })

    render(<ManagePaymentModal {...baseProps} active={open} payments={[open]} />)

    await userEvent.click(
      screen.getByRole("button", { name: "Cancelar cobrança" }),
    )

    expect(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    ).toBeDisabled()
  })

  it("defaults the date to today where the party is, not in UTC", () => {
    vi.useFakeTimers()
    // 01:30 UTC is still the previous evening in São Paulo, which is the day
    // the admin means when they record a payment taken that night.
    vi.setSystemTime(new Date("2026-08-21T01:30:00Z"))

    render(<ManagePaymentModal {...baseProps} />)

    expect(screen.getByLabelText("Data do pagamento")).toHaveValue("2026-08-20")
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
          payment_status: "partially_refunded",
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

  it("does not read an open charge as a payment of zero", () => {
    const open = payment({
      status: "pending",
      kind: "asaas",
      amount: null,
      base_amount: 22000,
      method: null,
      paid_at: null,
    })

    render(<ManagePaymentModal {...baseProps} active={open} payments={[open]} />)

    const row = screen.getByRole("row", { name: /aguardando escolha/i })
    expect(within(row).queryByText("R$ 0,00")).not.toBeInTheDocument()
  })

  it("offers no refund on a courtesy spot that received nothing", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[payment({ amount: 0, base_amount: 0 })]}
      />,
    )

    // markManualRefunded refuses every refund of zero, so the button could only
    // ever produce an error.
    expect(
      screen.queryByRole("button", { name: /marcar como reembolsado/i }),
    ).not.toBeInTheDocument()
  })

  it("forgets an abandoned refund amount when the dialog is reopened", async () => {
    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    await userEvent.click(
      screen.getByRole("button", { name: /marcar como reembolsado/i }),
    )
    await userEvent.type(screen.getByLabelText("Valor devolvido"), "50")
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))

    await userEvent.click(
      screen.getByRole("button", { name: /marcar como reembolsado/i }),
    )

    // The hint under the field promises a blank one refunds everything.
    expect(screen.getByLabelText("Valor devolvido")).toHaveValue("")
  })

  it("sends a mistyped refund amount instead of reading it as a full refund", async () => {
    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    await userEvent.click(
      screen.getByRole("button", { name: /marcar como reembolsado/i }),
    )
    await userEvent.type(screen.getByLabelText("Valor devolvido"), "5o")
    await userEvent.click(screen.getByRole("button", { name: "Marcar reembolso" }))

    // A number input answers "" for anything the browser rejects, and "" is the
    // sentinel for "refund the whole payment" — so R$ 220 would go back.
    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("amount")).toBe("5o")
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

describe("ManagePaymentModal - the Cobrança section", () => {
  beforeEach(() => {
    submit.mockClear()
    vi.mocked(navigator.clipboard.writeText).mockClear()
    fetcherData = undefined
    fetcherState = "idle"
  })

  const lastSubmission = () => {
    const [formData] = submit.mock.calls.at(-1) ?? []
    return formData as FormData
  }

  it("sends a charge for the ticket price by default", async () => {
    render(<ManagePaymentModal {...baseProps} />)

    await userEvent.click(screen.getByRole("button", { name: "Enviar cobrança" }))

    expect(lastSubmission().get("intent")).toBe("payment-offer")
    expect(lastSubmission().get("eventParticipantId")).toBe("ep-1")
    expect(lastSubmission().get("baseAmount")).toBe("220,00")
  })

  it("sends the amount the admin typed instead", async () => {
    render(<ManagePaymentModal {...baseProps} />)

    const amount = screen.getByLabelText("Valor a cobrar")
    await userEvent.clear(amount)
    await userEvent.type(amount, "150")
    await userEvent.click(screen.getByRole("button", { name: "Enviar cobrança" }))

    expect(lastSubmission().get("baseAmount")).toBe("150")
  })

  // An event with no price has nothing to suggest, and "0,00" is not a
  // suggestion -- it reaches the server as a zero and gets refused with the
  // wrong reason. Blank is the honest default, and blank is what the server
  // reads as "no amount given".
  it.each([null, 0])(
    "leaves the amount blank when the event prices nothing (%s)",
    (ticketPrice) => {
      render(<ManagePaymentModal {...baseProps} ticketPrice={ticketPrice} />)

      expect(screen.getByLabelText("Valor a cobrar")).toHaveValue("")
    },
  )

  it("sends a blank amount when the admin adds none", async () => {
    render(<ManagePaymentModal {...baseProps} ticketPrice={null} />)

    await userEvent.click(screen.getByRole("button", { name: "Enviar cobrança" }))

    expect(lastSubmission().get("baseAmount")).toBe("")
  })

  it("still suggests the open charge's amount when the event prices nothing", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        ticketPrice={null}
        payments={[openCharge]}
        active={openCharge}
      />,
    )

    expect(screen.getByLabelText("Valor a cobrar")).toHaveValue("220,00")
  })

  it("offers no charge when payments are switched off", () => {
    render(<ManagePaymentModal {...baseProps} paymentsEnabled={false} />)

    expect(
      screen.queryByRole("button", { name: "Enviar cobrança" }),
    ).not.toBeInTheDocument()
  })

  it("offers no charge for a social or staff spot", () => {
    render(<ManagePaymentModal {...baseProps} spotType="social" />)

    expect(
      screen.queryByRole("button", { name: "Enviar cobrança" }),
    ).not.toBeInTheDocument()
  })

  it("re-prices an open charge", async () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[openCharge]}
        active={openCharge}
      />,
    )

    const amount = screen.getByLabelText("Valor a cobrar")
    await userEvent.clear(amount)
    await userEvent.type(amount, "150")
    await userEvent.click(
      screen.getByRole("button", { name: "Reenviar com outro valor" }),
    )

    expect(lastSubmission().get("intent")).toBe("payment-offer")
    expect(lastSubmission().get("baseAmount")).toBe("150")
  })

  it("confirms before replacing a charge the participant is paying", async () => {
    const picked = payment({
      ...openCharge,
      status: "awaiting_payment",
      method: "pix",
      amount: 22199,
    })
    render(
      <ManagePaymentModal {...baseProps} payments={[picked]} active={picked} />,
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Reenviar com outro valor" }),
    )
    expect(submit).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole("button", { name: "Substituir cobrança" }),
    )
    expect(lastSubmission().get("intent")).toBe("payment-offer")
  })

  it("resends the email for the open charge", async () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[openCharge]}
        active={openCharge}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Reenviar email" }))

    expect(lastSubmission().get("intent")).toBe("payment-resend")
    expect(lastSubmission().get("paymentId")).toBe("open-1")
  })

  it("copies the WhatsApp message for the open charge", async () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[openCharge]}
        active={openCharge}
      />,
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Copiar mensagem" }),
    )

    const [copied] = vi.mocked(navigator.clipboard.writeText).mock.calls.at(
      -1,
    ) ?? [""]
    expect(copied).toContain("Ana")
    expect(copied).toContain("Festa de Setembro")
    expect(copied).toContain("/pagamento/open-1")
    expect(copied).toContain("Pix —")
    expect(copied).toContain("01/09/2026")
  })

  it("offers neither resend nor copy when nothing is open", () => {
    render(<ManagePaymentModal {...baseProps} />)

    expect(
      screen.queryByRole("button", { name: "Reenviar email" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Copiar mensagem" }),
    ).not.toBeInTheDocument()
  })
})

describe("ManagePaymentModal - the table's dates and amounts", () => {
  const sentOn = payment({
    id: "sent-1",
    kind: "asaas",
    status: "pending",
    method: null,
    amount: null,
    paid_at: null,
    base_amount: 22000,
    created_at: "2026-09-01T12:00:00Z",
    due_at: "2026-09-08T12:00:00Z",
  })

  it("shows the day the charge was sent, with no time", () => {
    render(
      <ManagePaymentModal {...baseProps} payments={[sentOn]} active={sentOn} />,
    )

    const row = screen.getByRole("row", { name: /Aguardando escolha/ })
    expect(within(row).getByText("01/09")).toBeInTheDocument()
  })

  it("names the payment date column for what it is", () => {
    render(<ManagePaymentModal {...baseProps} payments={[sentOn]} />)

    expect(
      screen.getByRole("columnheader", { name: "Data pagto" }),
    ).toBeInTheDocument()
  })

  it("shows what Positiv is owed on a charge nobody has chosen an option for", () => {
    render(
      <ManagePaymentModal {...baseProps} payments={[sentOn]} active={sentOn} />,
    )

    const row = screen.getByRole("row", { name: /Aguardando escolha/ })
    expect(within(row).getByText("R$ 220,00")).toBeInTheDocument()
    // No option picked means no method and so no fee yet.
    expect(within(row).getAllByText("—").length).toBeGreaterThan(0)
  })

  // POS-529 writes `amount` the moment the participant picks a method: the
  // gross they will pay. `asaas_net` stays null until the webhook confirms it,
  // so neither column may wait on it.
  it("keeps the gross out of Positiv's column once a method is picked", () => {
    const picked = payment({
      ...sentOn,
      id: "picked-1",
      status: "awaiting_payment",
      method: "pix",
      amount: 22199,
      asaas_net: null,
    })

    render(<ManagePaymentModal {...baseProps} payments={[picked]} />)

    const row = screen.getByRole("row", { name: /Aguardando pagamento/ })
    expect(within(row).getByText("R$ 220,00")).toBeInTheDocument()
    expect(within(row).getByText("R$ 1,99")).toBeInTheDocument()
    expect(within(row).queryByText("R$ 221,99")).not.toBeInTheDocument()
  })

  it("splits what Positiv kept from what the fees took", () => {
    const paidByCard = payment({
      id: "paid-card",
      kind: "asaas",
      status: "paid",
      method: "credit_card",
      installment_count: 3,
      base_amount: 22000,
      amount: 23454,
      asaas_net: 21900,
    })

    render(<ManagePaymentModal {...baseProps} payments={[paidByCard]} />)

    const row = screen.getByRole("row", { name: /Pago/ })
    // What landed in the account, and what the participant paid on top of it.
    expect(within(row).getByText("R$ 219,00")).toBeInTheDocument()
    expect(within(row).getByText("R$ 15,54")).toBeInTheDocument()
  })

  it("charges no fee to a payment that never went through Asaas", () => {
    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    const row = screen.getByRole("row", { name: /Pago/ })
    expect(within(row).getByText("R$ 220,00")).toBeInTheDocument()
    expect(within(row).getAllByText("—").length).toBeGreaterThan(0)
  })

  it("names the fee column", () => {
    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    expect(
      screen.getByRole("columnheader", { name: "Taxas" }),
    ).toBeInTheDocument()
  })

  it("never writes the fees into the amount column", () => {
    render(
      <ManagePaymentModal {...baseProps} payments={[sentOn]} active={sentOn} />,
    )

    expect(screen.queryByText(/\+ taxas/)).not.toBeInTheDocument()
  })

  it("fills the amount field in Brazilian decimals", () => {
    render(<ManagePaymentModal {...baseProps} ticketPrice={4180} />)

    expect(screen.getByLabelText("Valor a cobrar")).toHaveValue("41,80")
  })

  it("sends what the admin sees, commas and all", async () => {
    render(<ManagePaymentModal {...baseProps} ticketPrice={4180} />)

    await userEvent.click(screen.getByRole("button", { name: "Enviar cobrança" }))

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect((formData as FormData).get("baseAmount")).toBe("41,80")
  })
})

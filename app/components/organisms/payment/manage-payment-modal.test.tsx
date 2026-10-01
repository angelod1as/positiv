import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
    note: null,
    provider_dashboard_url: null,
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
    net: 0,
    payment_status: null,
    active_payment_id: null,
  },
  active: null as PaymentRow | null,
  paymentsEnabled: true,
  spotType: "regular" as const,
  ticketPrice: 22000,
  eventTitle: "Festa de Setembro",
  cardPaymentsEnabled: true,
  appOrigin: "https://www.positivparty.com",
  providerName: "Asaas",
}

const paidAsaasCharge = (overrides: Partial<PaymentRow> = {}): PaymentRow =>
  payment({
    id: "asaas-1",
    kind: "online",
    status: "paid",
    method: "pix",
    base_amount: 20000,
    amount: 22199,
    provider_charge_id: "pay_1",
    provider_dashboard_ref: "00005101",
    provider_dashboard_url: "https://sandbox.asaas.com/payment/show/00005101",
    refund_requested_at: null,
    ...overrides,
  })

const openCharge = payment({
  id: "open-1",
  kind: "online",
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
      kind: "online",
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

  it("shows what was paid, what went back and what is left", () => {
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
          net: 5000,
          payment_status: "partially_refunded",
        }}
      />,
    )

    expect(screen.getByText("Total pago").closest("div")).toHaveTextContent(
      "R$ 100,00",
    )
    expect(screen.getByText("Reembolsado").closest("div")).toHaveTextContent(
      "R$ 50,00",
    )
    expect(screen.getByText("Líquido").closest("div")).toHaveTextContent(
      "R$ 50,00",
    )
    expect(screen.queryByText("Taxas")).not.toBeInTheDocument()
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
      kind: "online",
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

  it("sends a refund to the charge in the provider's dashboard, named after it", () => {
    render(
      <ManagePaymentModal {...baseProps} payments={[paidAsaasCharge()]} />,
    )

    const link = screen.getByRole("link", { name: /Reembolsar no Asaas/ })
    expect(link).toHaveAttribute(
      "href",
      "https://sandbox.asaas.com/payment/show/00005101",
    )
    expect(link).toHaveAttribute("target", "_blank")
    expect(submit).not.toHaveBeenCalled()
  })

  it("says a refund is under way instead of offering another", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[
          paidAsaasCharge({ refund_requested_at: "2026-08-24T12:00:00Z" }),
        ]}
      />,
    )

    expect(
      screen.getByText(/aguardando o Asaas confirmar/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /Reembolsar no Asaas/ }),
    ).not.toBeInTheDocument()
  })

  it("says Asaas denied the last refund, why, and offers it again", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[
          paidAsaasCharge({
            refund_denied_at: "2026-09-29T00:25:53Z",
            refund_denial_reason: "Falha ao processar a transferência.",
          }),
        ]}
      />,
    )

    expect(
      screen.getByText(
        "O Asaas negou o último pedido de reembolso. Motivo: Falha ao processar a transferência. Você pode pedir de novo.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /Reembolsar no Asaas/ }),
    ).toBeInTheDocument()
  })

  it("says a refund was denied even when Asaas gave no reason", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[paidAsaasCharge({ refund_denied_at: "2026-09-29T00:25:53Z" })]}
      />,
    )

    expect(
      screen.getByText(
        "O Asaas negou o último pedido de reembolso. Você pode pedir de novo.",
      ),
    ).toBeInTheDocument()
  })

  it("says what went back, what is still on its way and what Asaas cancelled", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[
          paidAsaasCharge({
            status: "partially_refunded",
            refund_amount: 11715,
            refunded_at: "2026-09-29T01:09:02Z",
            refund_pending_amount: 10851,
            refund_cancelled_amount: 1000,
          }),
        ]}
      />,
    )

    expect(screen.getByText(/Devolvido R\$\s?117,15/)).toBeInTheDocument()
    expect(
      screen.getByText(/Em andamento no Asaas: R\$\s?108,51/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Cancelado pelo Asaas: R\$\s?10,00/)).toBeInTheDocument()
  })

  it("brings an Asaas payment up to date from Asaas", async () => {
    render(
      <ManagePaymentModal {...baseProps} payments={[paidAsaasCharge()]} />,
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Atualizar do Asaas" }),
    )

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect((formData as FormData).get("intent")).toBe("payment-sync")
    expect((formData as FormData).get("paymentId")).toBe("asaas-1")
  })

  it("offers no update from Asaas on a manual payment", () => {
    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    expect(
      screen.queryByRole("button", { name: "Atualizar do Asaas" }),
    ).not.toBeInTheDocument()
  })

  it("offers only the manual mark on a manual row", () => {
    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    expect(
      screen.getByRole("button", { name: /marcar como reembolsado/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /Reembolsar no Asaas/ }),
    ).not.toBeInTheDocument()
  })

  it("offers to cancel only an open charge", async () => {
    const open = payment({
      status: "pending",
      kind: "online",
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
          kind: "online",
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

  // Since POS-577 the price is flat and Positiv absorbs every fee. A hint
  // promising fees on top would have the admin undercharge to compensate.
  it("says the amount is what the participant pays, fees absorbed by Positiv", () => {
    render(<ManagePaymentModal {...baseProps} />)

    expect(
      screen.getByText(/as taxas ficam por conta da Positiv/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/entram por cima/i)).not.toBeInTheDocument()
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

  it.each(["social", "staff"])(
    "says why a %s spot has no charge instead of hiding it silently",
    (spotType) => {
      render(<ManagePaymentModal {...baseProps} spotType={spotType} />)

      expect(
        screen.getByText("Vaga social ou staff não paga: não há cobrança."),
      ).toBeInTheDocument()
    },
  )

  it("says nothing about the spot when payments are switched off", () => {
    render(
      <ManagePaymentModal {...baseProps} spotType="social" paymentsEnabled={false} />,
    )

    expect(
      screen.queryByText("Vaga social ou staff não paga: não há cobrança."),
    ).not.toBeInTheDocument()
  })

  it("puts the link and the message to send first, while a charge is open", () => {
    render(
      <ManagePaymentModal {...baseProps} payments={[openCharge]} active={openCharge} />,
    )

    const share = screen.getByRole("group", { name: "Link de pagamento" })
    expect(
      within(share).getByText("https://www.positivparty.com/pagamento/open-1"),
    ).toBeInTheDocument()
    expect(
      within(share).getByRole("button", { name: "Copiar mensagem" }),
    ).toBeInTheDocument()
    // Resending the email is another way to share the same link, so it sits
    // beside the copy; the actions that change the charge live apart.
    expect(
      within(share).getByRole("button", { name: "Reenviar email" }),
    ).toBeInTheDocument()
    expect(
      within(share).queryByRole("button", { name: "Reenviar com outro valor" }),
    ).not.toBeInTheDocument()
  })

  it("tells the admin to send the message as soon as the charge is created", () => {
    fetcherData = { success: true, intent: "payment-offer", emailSent: true }

    render(
      <ManagePaymentModal {...baseProps} payments={[openCharge]} active={openCharge} />,
    )

    expect(
      screen.getByText(
        "Cobrança criada e enviada por email. Copie a mensagem e mande também pelo WhatsApp.",
      ),
    ).toBeInTheDocument()
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

  it.each(["refunded", "partially_refunded"] as const)(
    "asks before charging again someone whose payment was %s",
    async (status) => {
      const refunded = paidAsaasCharge({
        status,
        refund_amount: status === "refunded" ? 21900 : 5000,
        refunded_at: "2026-09-02T12:00:00Z",
      })
      render(<ManagePaymentModal {...baseProps} payments={[refunded]} />)

      await userEvent.click(
        screen.getByRole("button", { name: "Enviar cobrança" }),
      )
      expect(submit).not.toHaveBeenCalled()
      expect(
        screen.getByText("Tem certeza que deseja gerar outra cobrança?"),
      ).toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Gerar cobrança" }))
      expect(lastSubmission().get("intent")).toBe("payment-offer")
      expect(lastSubmission().get("confirmAfterRefund")).toBe("true")
    },
  )

  it("does not ask when nothing was ever refunded", async () => {
    render(<ManagePaymentModal {...baseProps} />)

    await userEvent.click(screen.getByRole("button", { name: "Enviar cobrança" }))

    expect(lastSubmission().get("confirmAfterRefund")).toBeNull()
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
    expect(copied).toContain(
      "https://www.positivparty.com/pagamento/open-1",
    )
    expect(copied).toContain("Pix —")
    expect(copied).toContain("01/09/2026")
  })

  it("prices the WhatsApp message flat, from the charge's event price", async () => {
    const charge = { ...openCharge, base_amount: 25000 }
    render(
      <ManagePaymentModal {...baseProps} payments={[charge]} active={charge} />,
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Copiar mensagem" }),
    )

    const [copied] = vi.mocked(navigator.clipboard.writeText).mock.calls.at(
      -1,
    ) ?? [""]
    expect(copied).toContain("Pix — R$ 225,00")
    expect(copied).toContain("Cartão 6x de R$ 41,66 (total R$ 250,00)")
  })

  it("offers Pix alone in the WhatsApp message while card payments are off", async () => {
    const charge = { ...openCharge, base_amount: 25000 }
    render(
      <ManagePaymentModal
        {...baseProps}
        cardPaymentsEnabled={false}
        payments={[charge]}
        active={charge}
      />,
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Copiar mensagem" }),
    )

    const [copied] = vi.mocked(navigator.clipboard.writeText).mock.calls.at(
      -1,
    ) ?? [""]
    expect(copied).toContain("Pix — R$ 250,00")
    expect(copied).not.toContain("Cartão")
  })

  it("says so when the charge opened but the email did not go out", () => {
    fetcherData = { success: true, intent: "payment-offer", emailSent: false }

    render(<ManagePaymentModal {...baseProps} />)

    expect(screen.getByRole("alert")).toHaveTextContent(/o email não saiu/i)
  })

  it("stays quiet when the email went out", () => {
    fetcherData = { success: true, intent: "payment-offer", emailSent: true }

    render(<ManagePaymentModal {...baseProps} />)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("re-seeds the amount when the charge it was showing is gone", () => {
    const { rerender } = render(
      <ManagePaymentModal
        {...baseProps}
        payments={[openCharge]}
        active={payment({ ...openCharge, base_amount: 15000 })}
      />,
    )
    expect(screen.getByLabelText("Valor a cobrar")).toHaveValue("150,00")

    // What a cancellation looks like once revalidation lands.
    rerender(<ManagePaymentModal {...baseProps} payments={[openCharge]} active={null} />)

    expect(screen.getByLabelText("Valor a cobrar")).toHaveValue("220,00")
  })

  it("does not claim a charge was created when a resend fails", () => {
    fetcherData = { success: true, intent: "payment-resend", emailSent: false }

    render(<ManagePaymentModal {...baseProps} />)

    expect(screen.getByRole("alert")).toHaveTextContent(/a cobrança segue em aberto/i)
    expect(screen.queryByText(/A cobrança foi criada/i)).not.toBeInTheDocument()
  })

  it("confirms a resend that went out, since nothing else on screen changes", () => {
    fetcherData = { success: true, intent: "payment-resend", emailSent: true }

    render(<ManagePaymentModal {...baseProps} />)

    expect(screen.getByRole("status")).toHaveTextContent("Email reenviado.")
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
    kind: "online",
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

  it("shows the event price on a charge nobody has chosen an option for", () => {
    render(
      <ManagePaymentModal {...baseProps} payments={[sentOn]} active={sentOn} />,
    )

    const row = screen.getByRole("row", { name: /Aguardando escolha/ })
    expect(within(row).getByText("R$ 220,00")).toBeInTheDocument()
    // No option picked means no method yet.
    expect(within(row).getAllByText("—").length).toBeGreaterThan(0)
  })

  // `amount` is written the moment the participant picks an option: from
  // then on it is the price they pay, 10% off on Pix.
  it("shows the price of the option the participant picked", () => {
    const picked = payment({
      ...sentOn,
      id: "picked-1",
      status: "awaiting_payment",
      method: "pix",
      amount: 19800,
    })

    render(<ManagePaymentModal {...baseProps} payments={[picked]} />)

    const row = screen.getByRole("row", { name: /Aguardando pagamento/ })
    expect(within(row).getByText("R$ 198,00")).toBeInTheDocument()
    expect(within(row).queryByText("R$ 220,00")).not.toBeInTheDocument()
  })

  // What Asaas kept is Asaas's to report.
  it("shows what the participant paid, not what Asaas kept", () => {
    const paidByCard = payment({
      id: "paid-card",
      kind: "online",
      status: "paid",
      method: "credit_card",
      installment_count: 3,
      base_amount: 22000,
      amount: 22000,
    })

    render(<ManagePaymentModal {...baseProps} payments={[paidByCard]} />)

    const row = screen.getByRole("row", { name: /Pago/ })
    expect(within(row).getByText("R$ 220,00")).toBeInTheDocument()
    expect(within(row).queryByText("R$ 210,00")).not.toBeInTheDocument()
  })

  it("has no fee column", () => {
    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    expect(
      screen.queryByRole("columnheader", { name: "Taxas" }),
    ).not.toBeInTheDocument()
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

describe("ManagePaymentModal - correcting a manual payment", () => {
  beforeEach(() => {
    submit.mockClear()
    fetcherData = undefined
    fetcherState = "idle"
  })

  const mistyped = payment({
    amount: 21985,
    base_amount: 21985,
    method: "cash",
    paid_at: "2026-09-10T19:26:00Z",
    note: "Pago na porta",
  })

  const openEdit = async () => {
    await userEvent.click(screen.getByRole("button", { name: "Editar" }))
    return within(screen.getByRole("alertdialog"))
  }

  it("offers to edit a paid manual payment", () => {
    render(<ManagePaymentModal {...baseProps} payments={[payment({})]} />)

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument()
  })

  it("offers to edit a courtesy spot settled at zero", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[payment({ amount: 0, base_amount: 0 })]}
      />,
    )

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument()
  })

  it("does not offer to edit a refunded manual payment", () => {
    // The refund was measured against the amount; rewriting it would leave
    // the refund pointing at money that was never there.
    render(
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
      screen.queryByRole("button", { name: "Editar" }),
    ).not.toBeInTheDocument()
  })

  it("does not offer to edit a payment that went through Asaas", () => {
    render(
      <ManagePaymentModal {...baseProps} payments={[paidAsaasCharge()]} />,
    )

    expect(
      screen.queryByRole("button", { name: "Editar" }),
    ).not.toBeInTheDocument()
  })

  it("opens on the payment as it was recorded", async () => {
    render(<ManagePaymentModal {...baseProps} payments={[mistyped]} />)

    const dialog = await openEdit()

    expect(dialog.getByLabelText("Valor recebido")).toHaveValue("219,85")
    expect(dialog.getByLabelText("Forma")).toHaveValue("cash")
    // 19:26 UTC is 16:26 in São Paulo — still the 10th.
    expect(dialog.getByLabelText("Data do pagamento")).toHaveValue(
      "2026-09-10",
    )
    expect(dialog.getByLabelText("Observação")).toHaveValue("Pago na porta")
  })

  it("does not turn the amount field into a stepper", async () => {
    render(<ManagePaymentModal {...baseProps} payments={[mistyped]} />)

    const dialog = await openEdit()

    expect(
      dialog.queryByRole("spinbutton", { name: "Valor recebido" }),
    ).not.toBeInTheDocument()
    expect(
      dialog.getByRole("textbox", { name: "Valor recebido" }),
    ).toBeInTheDocument()
  })

  it("sends the corrected payment", async () => {
    render(<ManagePaymentModal {...baseProps} payments={[mistyped]} />)

    const dialog = await openEdit()
    const amount = dialog.getByLabelText("Valor recebido")
    await userEvent.clear(amount)
    await userEvent.type(amount, "220,00")
    await userEvent.selectOptions(dialog.getByLabelText("Forma"), "transfer")
    const note = dialog.getByLabelText("Observação")
    await userEvent.clear(note)
    await userEvent.type(note, "Valor corrigido")
    await userEvent.click(
      dialog.getByRole("button", { name: "Salvar alterações" }),
    )

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("intent")).toBe("payment-manual-edit")
    expect(formData.get("paymentId")).toBe("p1")
    expect(formData.get("amount")).toBe("220,00")
    expect(formData.get("method")).toBe("transfer")
    expect(formData.get("paidAt")).toBe("2026-09-10")
    expect(formData.get("note")).toBe("Valor corrigido")
  })

  it("forgets an abandoned edit when the dialog is reopened", async () => {
    render(<ManagePaymentModal {...baseProps} payments={[mistyped]} />)

    let dialog = await openEdit()
    await userEvent.type(dialog.getByLabelText("Valor recebido"), "999")
    await userEvent.click(dialog.getByRole("button", { name: "Fechar" }))

    dialog = await openEdit()
    expect(dialog.getByLabelText("Valor recebido")).toHaveValue("219,85")
  })

  it("refuses a second click while an edit is in flight", async () => {
    fetcherState = "submitting"
    render(<ManagePaymentModal {...baseProps} payments={[mistyped]} />)

    const dialog = await openEdit()

    expect(
      dialog.getByRole("button", { name: "Salvar alterações" }),
    ).toBeDisabled()
  })
})

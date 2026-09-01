import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import type { ParticipantEventHistoryData } from "~types/database/entities.types"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { FinancialSummary } from "./financial-summary"

const createMockHistoryItem = (
  overrides: Partial<ParticipantEventHistoryData> = {},
): ParticipantEventHistoryData => ({
  id: "1",
  profile_id: "profile-1",
  event_id: "event-1",
  event_title: "Test Event",
  event_emoji: "🎉",
  time_event_start: "2024-03-01T10:00:00",
  ticket_price: 10000,
  application_status: "finalised",
  attendance_status: "attended",
  admin_general_notes: null,
  is_user_applied: true,
  application_date: "2024-02-15T10:00:00",
  created_at: "2024-02-15T10:00:00",
  bond: null,
  notes: null,
  has_paid: true,
  payment: 15000,
  paid_gross: 15000,
  net: 15000,
  fee: 0,
  refunded: 0,
  payment_status: "paid",
  active_payment_id: null,
  referrals: null,
  referred: "",
  companions: null,
  spot_type: "regular",
  cancellation_date: null,
  is_veteran: true,
  approved_to_attend: "approved",
  updated_at: "2024-02-15T10:00:00",
  was_selected_for_rotation: false,
  ...overrides,
})

describe("FinancialSummary", () => {
  it("should render nothing when no payments exist", () => {
    const historyWithNoPayments: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ paid_gross: 0, net: 0, payment_status: null }),
      createMockHistoryItem({ id: "2", paid_gross: 0, net: 0, payment_status: null }),
    ]

    const { container } = render(
      <FinancialSummary participantHistory={historyWithNoPayments} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("should render nothing when history is empty", () => {
    const { container } = render(<FinancialSummary participantHistory={[]} />)

    expect(container).toBeEmptyDOMElement()
  })


  it("leaves a fully refunded participation out of what Positiv kept", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        paid_gross: 22000,
        fee: 0,
        net: 0,
        refunded: 22000,
        payment_status: "refunded",
        ticket_price: 20000,
      }),
    ]

    const { container } = render(
      <FinancialSummary participantHistory={history} />,
    )

    // the money went back, so there is nothing to summarise — and above all no
    // surplus of -R$ 200,00, which would read as someone who underpaid
    expect(container).toBeEmptyDOMElement()
  })

  it("counts a spot that owed nothing as a settled participation", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        paid_gross: 0,
        fee: 0,
        net: 0,
        payment_status: "paid",
        spot_type: "staff",
        ticket_price: 20000,
      }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    // it counts as an event that was settled, contributes nothing to the money
    // and has no difference to report — a staff spot did not underpay
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.queryByText("-R$ 200,00")).not.toBeInTheDocument()
  })

  it("ignores a charge that was never collected", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        paid_gross: 0,
        fee: 0,
        net: 0,
        payment_status: "awaiting_payment",
      }),
    ]

    const { container } = render(
      <FinancialSummary participantHistory={history} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("separates what was paid from what Positiv kept", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        paid_gross: 23000,
        fee: 1000,
        net: 22000,
        ticket_price: 20000,
      }),
      createMockHistoryItem({
        id: "2",
        paid_gross: 11000,
        fee: 500,
        net: 10500,
        ticket_price: 10000,
      }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("R$ 340,00")).toBeInTheDocument() // total pago
    expect(screen.getByText("R$ 15,00")).toBeInTheDocument() // taxas
    expect(screen.getByText("R$ 325,00")).toBeInTheDocument() // líquido
    expect(screen.getByText("R$ 162,50")).toBeInTheDocument() // média, do líquido
    expect(screen.getByText("+R$ 25,00")).toBeInTheDocument() // diferença
  })

  it("counts an event as paid when the ledger says so, even at zero surplus", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        paid_gross: 20000,
        fee: 0,
        net: 20000,
        ticket_price: 20000,
      }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("+R$ 0,00")).toBeInTheDocument()
  })

  it("should display section title 'Resumo Financeiro'", () => {
    const history = [createMockHistoryItem()]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText(adminParticipantsCopy.financialSummary.title)).toBeInTheDocument()
  })

  it("should display correct total paid (sum of all payments)", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ paid_gross: 15000, net: 15000 }),
      createMockHistoryItem({ id: "2", paid_gross: 20000, net: 20000 }),
      createMockHistoryItem({ id: "3", paid_gross: 10000, net: 10000 }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    // no fees on these, so the gross tile and the net tile read the same
    expect(screen.getAllByText("R$ 450,00")).toHaveLength(2)
  })

  it("should display correct count of paid events", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ paid_gross: 15000, net: 15000 }),
      createMockHistoryItem({ id: "2", paid_gross: 20000, net: 20000 }),
      createMockHistoryItem({ id: "3", paid_gross: 0, net: 0, payment_status: null }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("should display correct average per event", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ paid_gross: 10000, net: 10000 }),
      createMockHistoryItem({ id: "2", paid_gross: 20000, net: 20000 }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("R$ 150,00")).toBeInTheDocument()
  })

  it("should display diferença total (sum of payment - ticket_price)", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ paid_gross: 15000, net: 15000, ticket_price: 10000 }),
      createMockHistoryItem({ id: "2", paid_gross: 20000, net: 20000, ticket_price: 18000 }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("+R$ 70,00")).toBeInTheDocument()
  })

  it("should handle null ticket_price when calculating surplus", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ paid_gross: 15000, net: 15000, ticket_price: null }),
      createMockHistoryItem({ id: "2", paid_gross: 10000, net: 10000, ticket_price: 8000 }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("+R$ 170,00")).toBeInTheDocument()
  })

  it("should display payment list with event names and amounts", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        event_title: "Evento Alpha",
        event_emoji: "🎉",
        paid_gross: 15000, net: 15000,
        ticket_price: 10000,
      }),
      createMockHistoryItem({
        id: "2",
        event_title: "Evento Beta",
        event_emoji: "🎊",
        paid_gross: 20000, net: 20000,
        ticket_price: 18000,
      }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText(/Evento Alpha/)).toBeInTheDocument()
    expect(screen.getByText(/Evento Beta/)).toBeInTheDocument()
  })

  it("should display surplus per event in the payment list", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        event_title: "Evento Alpha",
        paid_gross: 15000, net: 15000,
        ticket_price: 10000,
      }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    // Both total surplus (+R$ 50,00) and per-event surplus (+R$ 50,00) show the same value
    const surplusElements = screen.getAllByText(/\+R\$ 50,00/)
    expect(surplusElements.length).toBeGreaterThanOrEqual(1)
  })

  it("should display negative surplus with minus sign", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        event_title: "Evento Desconto",
        paid_gross: 8000, net: 8000,
        ticket_price: 10000,
      }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    // Both total surplus (-R$ 20,00) and per-event surplus (-R$ 20,00) show the same value
    const surplusElements = screen.getAllByText(/-R\$ 20,00/)
    expect(surplusElements.length).toBeGreaterThanOrEqual(1)
  })

  it("lists a settled participation whatever it cost, and nothing else", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        event_title: "Evento Pago",
        paid_gross: 15000, net: 15000,
      }),
      createMockHistoryItem({
        id: "2",
        event_title: "Evento Gratis",
        paid_gross: 0, net: 0,
        payment_status: "paid",
      }),
      createMockHistoryItem({
        id: "3",
        event_title: "Evento Sem Pagamento",
        paid_gross: 0, net: 0,
        payment_status: null,
      }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText(/Evento Pago/)).toBeInTheDocument()
    expect(screen.getByText(/Evento Gratis/)).toBeInTheDocument()
    expect(screen.queryByText(/Evento Sem Pagamento/)).not.toBeInTheDocument()
  })
})

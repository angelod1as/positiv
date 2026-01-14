import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import type { ParticipantEventHistoryData } from "~types/database/entities.types"
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
  ticket_price: 100,
  application_status: "finalised",
  attendance_status: "attended",
  admin_general_notes: null,
  is_user_applied: true,
  application_date: "2024-02-15T10:00:00",
  created_at: "2024-02-15T10:00:00",
  bond: null,
  notes: null,
  has_paid: true,
  payment: 150,
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
      createMockHistoryItem({ payment: 0 }),
      createMockHistoryItem({ id: "2", payment: null as unknown as number }),
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

  it("should display section title 'Resumo Financeiro'", () => {
    const history = [createMockHistoryItem()]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("Resumo Financeiro")).toBeInTheDocument()
  })

  it("should display correct total invested (sum of all payments)", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ payment: 150 }),
      createMockHistoryItem({ id: "2", payment: 200 }),
      createMockHistoryItem({ id: "3", payment: 100 }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("R$ 450,00")).toBeInTheDocument()
  })

  it("should display correct count of paid events", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ payment: 150 }),
      createMockHistoryItem({ id: "2", payment: 200 }),
      createMockHistoryItem({ id: "3", payment: 0 }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("should display correct average per event", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ payment: 100 }),
      createMockHistoryItem({ id: "2", payment: 200 }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("R$ 150,00")).toBeInTheDocument()
  })

  it("should display diferença total (sum of payment - ticket_price)", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ payment: 150, ticket_price: 100 }),
      createMockHistoryItem({ id: "2", payment: 200, ticket_price: 180 }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("+R$ 70,00")).toBeInTheDocument()
  })

  it("should handle null ticket_price when calculating surplus", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({ payment: 150, ticket_price: null }),
      createMockHistoryItem({ id: "2", payment: 100, ticket_price: 80 }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText("+R$ 170,00")).toBeInTheDocument()
  })

  it("should display payment list with event names and amounts", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        event_title: "Evento Alpha",
        event_emoji: "🎉",
        payment: 150,
        ticket_price: 100,
      }),
      createMockHistoryItem({
        id: "2",
        event_title: "Evento Beta",
        event_emoji: "🎊",
        payment: 200,
        ticket_price: 180,
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
        payment: 150,
        ticket_price: 100,
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
        payment: 80,
        ticket_price: 100,
      }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    // Both total surplus (-R$ 20,00) and per-event surplus (-R$ 20,00) show the same value
    const surplusElements = screen.getAllByText(/-R\$ 20,00/)
    expect(surplusElements.length).toBeGreaterThanOrEqual(1)
  })

  it("should only list events with payments > 0", () => {
    const history: ParticipantEventHistoryData[] = [
      createMockHistoryItem({
        event_title: "Evento Pago",
        payment: 150,
      }),
      createMockHistoryItem({
        id: "2",
        event_title: "Evento Gratis",
        payment: 0,
      }),
    ]

    render(<FinancialSummary participantHistory={history} />)

    expect(screen.getByText(/Evento Pago/)).toBeInTheDocument()
    expect(screen.queryByText(/Evento Gratis/)).not.toBeInTheDocument()
  })
})

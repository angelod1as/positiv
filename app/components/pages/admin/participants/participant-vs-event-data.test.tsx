import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import type { ParticipantVsEvent } from "~types/database/entities.types"
import { ParticipantVsEventData } from "./participant-vs-event-data"

// Mock the SchemaForm component
vi.mock("~/components/forms/base/schema-form", () => ({
  SchemaForm: ({
    children,
    options,
  }: {
    children: (props: {
      Field: ({ name }: { name: string }) => ReactNode
      Errors: () => null
      Error: () => null
      Button: () => ReactNode
    }) => ReactNode
    options?: Record<string, unknown>
  }) => {
    const hasFlagOptions = !!options?.flag
    return (
      <div data-testid="schema-form">
        <div data-testid="has-flag-options">
          {hasFlagOptions ? "true" : "false"}
        </div>
        {children({
          Field: ({ name }: { name: string }) => (
            <div data-testid={`field-${name}`}>{name}</div>
          ),
          Errors: () => null,
          Error: () => null,
          Button: () => <button>Submit</button>,
        })}
      </div>
    )
  },
}))

const mockEventParticipant: ParticipantVsEvent = {
  id: "123",
  event_id: "event-123",
  profile_id: "profile-123",
  application_date: "2024-01-01",
  application_status: "finalised",
  attendance_status: "pending",
  spot_type: "regular",
  payment: 100,
  has_paid: false,
  is_veteran: false,
  approved_to_attend: "pending",
  admin_general_notes: "",
  bond: "Test bond",
  companions: "Test companions",
  notes: "Test notes",
  referrals: "Test referrals",
  referred: "Test referred",
  event_title: "Test Event",
  event_emoji: "🎉",
  is_user_applied: true,
  cancellation_date: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  was_selected_for_rotation: false,
}

describe("ParticipantVsEventData", () => {
  it("should render flag and flag_notes fields", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)

    // Check that flag fields are rendered
    expect(screen.getByTestId("field-flag")).toBeInTheDocument()
    expect(screen.getByTestId("field-flag_notes")).toBeInTheDocument()
  })

  it("should render flag_notes after flag field", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)

    const fields = screen.getAllByTestId(/^field-/).map((el) => el.textContent)
    const flagIndex = fields.indexOf("flag")
    const flagNotesIndex = fields.indexOf("flag_notes")

    // Check the order of fields
    expect(flagIndex).toBeLessThan(flagNotesIndex)
  })

  it("should pass flag options to SchemaForm", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)

    expect(screen.getByTestId("has-flag-options")).toHaveTextContent("true")
  })

  it("should render attendance and application status fields", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)

    expect(screen.getByTestId("field-attendance_status")).toBeInTheDocument()
    expect(screen.getByTestId("field-application_status")).toBeInTheDocument()
  })

  it("should render spot_type field", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)

    expect(screen.getByTestId("field-spot_type")).toBeInTheDocument()
  })
})

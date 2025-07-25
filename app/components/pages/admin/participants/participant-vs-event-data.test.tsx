import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ParticipantVsEventData } from "./participant-vs-event-data"
import type { ParticipantVsEvent } from "~types/database/entities.types"
import type { ReactNode } from "react"

// Mock the SchemaForm component
vi.mock("~/components/forms/base/schema-form", () => ({
  SchemaForm: ({ children, options }: { 
    children: (props: {
      Field: ({ name }: { name: string }) => ReactNode
      Errors: () => null
      Error: () => null
      Button: () => ReactNode
    }) => ReactNode
    options?: Record<string, unknown>
  }) => {
    // Verify that approved_to_attend options are passed
    const hasApprovedToAttendOptions = !!options?.approved_to_attend
    return (
      <div data-testid="schema-form">
        <div data-testid="has-approved-to-attend-options">
          {hasApprovedToAttendOptions ? "true" : "false"}
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
  event_title: "Test Event",
  event_emoji: "🎉",
  is_user_applied: true,
  cancellation_date: null,
  created_at: "2024-01-01",
  flag: "yellow",
  flag_notes: "Precisa de acompanhamento próximo",
}

describe("ParticipantVsEventData", () => {
  it("should render the approved_to_attend field", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)
    
    // Check that the approved_to_attend field is rendered
    expect(screen.getByTestId("field-approved_to_attend")).toBeInTheDocument()
  })

  it("should pass approved_to_attend options to SchemaForm", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)
    
    // Check that approved_to_attend options are passed to SchemaForm
    expect(screen.getByTestId("has-approved-to-attend-options")).toHaveTextContent("true")
  })

  it("should render approved_to_attend field after application_status and before spot_type", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)
    
    const fields = screen.getAllByTestId(/^field-/).map(el => el.textContent)
    const attendanceIndex = fields.indexOf("attendance_status")
    const applicationIndex = fields.indexOf("application_status")
    const approvedIndex = fields.indexOf("approved_to_attend")
    const spotTypeIndex = fields.indexOf("spot_type")
    
    // Check the order of fields
    expect(attendanceIndex).toBeLessThan(applicationIndex)
    expect(applicationIndex).toBeLessThan(approvedIndex)
    expect(approvedIndex).toBeLessThan(spotTypeIndex)
  })

  it("should render flag and flag_notes fields", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)
    
    // Check that flag fields are rendered
    expect(screen.getByTestId("field-flag")).toBeInTheDocument()
    expect(screen.getByTestId("field-flag_notes")).toBeInTheDocument()
  })

  it("should render flag_notes after flag field", () => {
    render(<ParticipantVsEventData eventParticipant={mockEventParticipant} />)
    
    const fields = screen.getAllByTestId(/^field-/).map(el => el.textContent)
    const flagIndex = fields.indexOf("flag")
    const flagNotesIndex = fields.indexOf("flag_notes")
    
    // Check the order of fields
    expect(flagIndex).toBeLessThan(flagNotesIndex)
  })
})
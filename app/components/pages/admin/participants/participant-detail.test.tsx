import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import { ParticipantDetail } from "./participant-detail"

vi.mock("~/components/pages/admin/participants/basic-data", () => ({
  BasicData: () => <div data-testid="basic-data">Basic Data Component</div>,
}))

vi.mock(
  "~/components/pages/admin/participants/participant-vs-event-data",
  () => ({
    ParticipantVsEventData: () => (
      <div data-testid="participant-vs-event-data">
        Participant Vs Event Data Component
      </div>
    ),
  }),
)

vi.mock(
  "~/components/pages/admin/participants/participant-event-history",
  () => ({
    ParticipantEventHistory: () => (
      <div data-testid="participant-event-history">
        Participant Event History Component
      </div>
    ),
  }),
)

const mockProfile = {
  id: "profile-1",
  profile_id: "profile-1",
  full_name: "João Silva",
  social_name: "João",
  date_of_birth: "1990-01-01",
  is_veteran: true,
  email: "joao@test.com",
  gender: ["homem cis"],
  orientation: ["heterossexual"],
  pronouns: "ele/dele",
  phone: "11999999999",
  cpf: "12345678900",
  rg: "123456789",
  rg_issuer: "SSP",
  where_lives: "São Paulo",
  how_came_to_us: "Amigos",
  approved_to_attend: "approved",
  flag: "none",
  flag_notes: null,
  event_id: "event-1",
  application_status: "finalised",
  attendance_status: "attended",
  slot_type: "regular",
  admin_notes: null,
  was_admin_skipped_last_event: false,
  attended_events_count: 5,
}

const mockCurrentEventData = {
  id: "ep-1",
  profile_id: "profile-1",
  event_id: "event-1",
  event_title: "Workshop BDSM",
  event_emoji: "🌱",
  is_veteran: true,
  approved_to_attend: "approved",
  application_status: "finalised",
  attendance_status: "attended",
  slot_type: "regular",
  admin_notes: null,
}

const mockFullHistory = [
  {
    id: "ep-2",
    profile_id: "profile-1",
    event_id: "event-2",
    event_title: "Previous Event",
    event_emoji: "💬",
    time_event_start: "2024-02-15T14:00:00",
    is_veteran: true,
    approved_to_attend: "approved",
    application_status: "finalised",
    attendance_status: "attended",
    slot_type: "regular",
    admin_notes: null,
  },
]

const createTestRouter = (element: React.ReactElement) => {
  return createMemoryRouter([{ path: "/", element }])
}

describe("ParticipantDetail", () => {
  describe("Profile-only mode (no currentEvent)", () => {
    it("should display participant name and age", () => {
      const router = createTestRouter(
        <ParticipantDetail
          profile={mockProfile as never}
          fullHistory={[]}
        />,
      )
      render(<RouterProvider router={router} />)

      expect(screen.getByText(/João, \d+/)).toBeInTheDocument()
    })

    it("should NOT display event info when currentEvent is not provided", () => {
      const router = createTestRouter(
        <ParticipantDetail
          profile={mockProfile as never}
          fullHistory={[]}
        />,
      )
      render(<RouterProvider router={router} />)

      expect(screen.queryByText(/No evento/)).not.toBeInTheDocument()
    })

    it("should NOT render ParticipantVsEventData when currentEvent is not provided", () => {
      const router = createTestRouter(
        <ParticipantDetail
          profile={mockProfile as never}
          fullHistory={[]}
        />,
      )
      render(<RouterProvider router={router} />)

      expect(
        screen.queryByTestId("participant-vs-event-data"),
      ).not.toBeInTheDocument()
    })

    it("should always render BasicData component", () => {
      const router = createTestRouter(
        <ParticipantDetail
          profile={mockProfile as never}
          fullHistory={[]}
        />,
      )
      render(<RouterProvider router={router} />)

      expect(screen.getByTestId("basic-data")).toBeInTheDocument()
    })

    it("should render ParticipantEventHistory when fullHistory has items", () => {
      const router = createTestRouter(
        <ParticipantDetail
          profile={mockProfile as never}
          fullHistory={mockFullHistory as never}
        />,
      )
      render(<RouterProvider router={router} />)

      expect(screen.getByTestId("participant-event-history")).toBeInTheDocument()
    })

    it("should NOT render ParticipantEventHistory when fullHistory is empty", () => {
      const router = createTestRouter(
        <ParticipantDetail
          profile={mockProfile as never}
          fullHistory={[]}
        />,
      )
      render(<RouterProvider router={router} />)

      expect(
        screen.queryByTestId("participant-event-history"),
      ).not.toBeInTheDocument()
    })
  })

  describe("Event mode (with currentEvent)", () => {
    it("should display event info when currentEvent is provided", () => {
      const router = createTestRouter(
        <ParticipantDetail
          profile={mockProfile as never}
          fullHistory={[]}
          currentEvent={{
            data: mockCurrentEventData as never,
            eventId: "event-1",
          }}
        />,
      )
      render(<RouterProvider router={router} />)

      expect(screen.getByText(/No evento/)).toBeInTheDocument()
      expect(screen.getByText(/🌱 Workshop BDSM/)).toBeInTheDocument()
    })

    it("should render ParticipantVsEventData when currentEvent is provided", () => {
      const router = createTestRouter(
        <ParticipantDetail
          profile={mockProfile as never}
          fullHistory={[]}
          currentEvent={{
            data: mockCurrentEventData as never,
            eventId: "event-1",
          }}
        />,
      )
      render(<RouterProvider router={router} />)

      expect(
        screen.getByTestId("participant-vs-event-data"),
      ).toBeInTheDocument()
    })

    it("should render ParticipantVsEventData BEFORE BasicData in event mode", () => {
      const router = createTestRouter(
        <ParticipantDetail
          profile={mockProfile as never}
          fullHistory={[]}
          currentEvent={{
            data: mockCurrentEventData as never,
            eventId: "event-1",
          }}
        />,
      )
      render(<RouterProvider router={router} />)

      const eventData = screen.getByTestId("participant-vs-event-data")
      const basicData = screen.getByTestId("basic-data")

      expect(
        eventData.compareDocumentPosition(basicData) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    })
  })

  describe("Edge cases", () => {
    it("should use full_name when social_name is not available", () => {
      const profileWithoutSocialName = {
        ...mockProfile,
        social_name: null,
      }
      const router = createTestRouter(
        <ParticipantDetail
          profile={profileWithoutSocialName as never}
          fullHistory={[]}
        />,
      )
      render(<RouterProvider router={router} />)

      expect(screen.getByText(/João Silva, \d+/)).toBeInTheDocument()
    })
  })
})

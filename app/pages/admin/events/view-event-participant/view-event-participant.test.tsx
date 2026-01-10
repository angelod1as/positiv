/* eslint-disable @typescript-eslint/no-explicit-any */
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import ViewEventParticipant, {
  shouldRevalidate,
} from "./view-event-participant"

// Mock child components that might cause router issues
vi.mock("~/components/pages/admin/participants/basic-data", () => ({
  BasicData: () => <div>Basic Data</div>,
}))

vi.mock(
  "~/components/pages/admin/participants/participant-vs-event-data",
  () => ({
    ParticipantVsEventData: () => <div>Participant Vs Event Data</div>,
  }),
)

vi.mock(
  "~/components/pages/admin/participants/participant-event-history-ag",
  () => ({
    ParticipantEventHistoryAG: ({
      participantHistory,
    }: {
      participantHistory: any[]
    }) => (
      <div>
        <h2>Histórico de Participações</h2>
        {participantHistory.map((p, i) => (
          <div key={i}>{p.event_title}</div>
        ))}
      </div>
    ),
  }),
)

describe("ViewEventParticipant", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createTestRouter = (loaderData: any) => {
    return createMemoryRouter([
      {
        path: "/",
        element: (
          <ViewEventParticipant
            loaderData={loaderData}
            params={{ eventId: "test-event", profileId: "test-profile" }}
            matches={[] as any}
          />
        ),
      },
    ])
  }

  it("should display participant history section for veteran participants with history", () => {
    const mockLoaderData = {
      profile: {
        id: "profile-1",
        full_name: "João Silva",
        social_name: "João",
        date_of_birth: "1990-01-01",
        is_veteran: true,
      },
      participantHistory: [
        {
          event_title: "Workshop BDSM",
          event_emoji: "🌱",
        },
      ],
      fullHistory: [
        {
          id: "event-2",
          event_title: "Previous Event",
          event_emoji: "💬",
          time_event_start: "2024-02-15T14:00:00",
        },
      ],
    }

    const router = createTestRouter(mockLoaderData)
    render(<RouterProvider router={router} />)

    // Should show the history section title
    expect(screen.getByText("Histórico de Participações")).toBeInTheDocument()
  })

  it("should NOT display participant history section for non-veteran participants", () => {
    const mockLoaderData = {
      profile: {
        id: "profile-2",
        full_name: "Maria Santos",
        social_name: "Maria",
        date_of_birth: "1990-01-01",
        is_veteran: false,
      },
      participantHistory: [
        {
          event_title: "Workshop BDSM",
          event_emoji: "🌱",
        },
      ],
      fullHistory: [],
    }

    const router = createTestRouter(mockLoaderData)
    render(<RouterProvider router={router} />)

    // Should NOT show the history section title
    expect(
      screen.queryByText("Histórico de Participações"),
    ).not.toBeInTheDocument()
  })

  it("should NOT display participant history section for veteran with empty history", () => {
    const mockLoaderData = {
      profile: {
        id: "profile-3",
        full_name: "Carlos Santos",
        social_name: "Carlos",
        date_of_birth: "1990-01-01",
        is_veteran: true,
      },
      participantHistory: [
        {
          event_title: "Workshop BDSM",
          event_emoji: "🌱",
        },
      ],
      fullHistory: [], // Empty history
    }

    const router = createTestRouter(mockLoaderData)
    render(<RouterProvider router={router} />)

    // Should NOT show the history section title even for veterans with no history
    expect(
      screen.queryByText("Histórico de Participações"),
    ).not.toBeInTheDocument()
  })

  it("should display basic participant information regardless of veteran status", () => {
    const mockLoaderData = {
      profile: {
        id: "profile-1",
        full_name: "João Silva",
        social_name: "João",
        date_of_birth: "1990-01-01",
        is_veteran: true,
      },
      participantHistory: [
        {
          event_title: "Workshop BDSM",
          event_emoji: "🌱",
        },
      ],
      fullHistory: [],
    }

    const router = createTestRouter(mockLoaderData)
    render(<RouterProvider router={router} />)

    // Should show participant name and age
    expect(screen.getByText(/João, \d+/)).toBeInTheDocument()

    // Should show event info
    expect(screen.getByText(/No evento/)).toBeInTheDocument()
    expect(screen.getByText(/🌱 Workshop BDSM/)).toBeInTheDocument()
  })

  it("should handle null profile gracefully", () => {
    const mockLoaderData = {
      profile: null,
      participantHistory: [
        {
          event_title: "Workshop BDSM",
          event_emoji: "🌱",
        },
      ],
      fullHistory: [],
    }

    const router = createTestRouter(mockLoaderData)
    render(<RouterProvider router={router} />)

    // Should not render anything
    expect(
      screen.queryByText("Histórico de Participações"),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/João/)).not.toBeInTheDocument()
  })
})

describe("shouldRevalidate", () => {
  const baseArgs = {
    currentUrl: new URL(
      "http://localhost/admin/eventos/event-a/participantes/profile-1",
    ),
    nextUrl: new URL(
      "http://localhost/admin/eventos/event-b/participantes/profile-1",
    ),
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    text: undefined,
    formData: undefined,
    json: undefined,
    actionStatus: undefined,
    actionResult: undefined,
  }

  it("should return true when eventId changes", () => {
    const result = shouldRevalidate({
      ...baseArgs,
      currentParams: { eventId: "event-a", profileId: "profile-1" },
      nextParams: { eventId: "event-b", profileId: "profile-1" },
      defaultShouldRevalidate: false,
    })
    expect(result).toBe(true)
  })

  it("should return true when profileId changes", () => {
    const result = shouldRevalidate({
      ...baseArgs,
      currentParams: { eventId: "event-a", profileId: "profile-1" },
      nextParams: { eventId: "event-a", profileId: "profile-2" },
      defaultShouldRevalidate: false,
    })
    expect(result).toBe(true)
  })

  it("should return true when both eventId and profileId change", () => {
    const result = shouldRevalidate({
      ...baseArgs,
      currentParams: { eventId: "event-a", profileId: "profile-1" },
      nextParams: { eventId: "event-b", profileId: "profile-2" },
      defaultShouldRevalidate: false,
    })
    expect(result).toBe(true)
  })

  it("should return defaultShouldRevalidate when params unchanged", () => {
    const resultFalse = shouldRevalidate({
      ...baseArgs,
      currentParams: { eventId: "event-a", profileId: "profile-1" },
      nextParams: { eventId: "event-a", profileId: "profile-1" },
      defaultShouldRevalidate: false,
    })
    expect(resultFalse).toBe(false)

    const resultTrue = shouldRevalidate({
      ...baseArgs,
      currentParams: { eventId: "event-a", profileId: "profile-1" },
      nextParams: { eventId: "event-a", profileId: "profile-1" },
      defaultShouldRevalidate: true,
    })
    expect(resultTrue).toBe(true)
  })
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DashboardEvent } from "~/components/organisms/tables/admin/events-table"
import { adminDashboardCopy } from "~/copy/admin"

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
    useNavigate: () => vi.fn(),
  }
})

vi.mock("~/components/organisms/event-card/event-card", () => ({
  EventCard: ({ event }: { event: DashboardEvent }) => (
    <div data-testid="event-card">{event.title}</div>
  ),
}))

vi.mock("~/components/organisms/tables/admin/events-table", () => ({
  AdminDashboardEventsTable: ({ events }: { events: DashboardEvent[] }) => (
    <div data-testid="events-table">
      <h2>Todos os eventos</h2>
      <div>Events count: {events.length}</div>
    </div>
  ),
}))

vi.mock("~/components/organisms/tables/admin/recent-profiles-table", () => ({
  RecentProfilesTable: () => <div data-testid="recent-profiles-table" />,
}))

vi.mock("~/components/organisms/tables/admin/recent-feedbacks-table", () => ({
  RecentFeedbacksTable: () => <div data-testid="recent-feedbacks-table" />,
}))

vi.mock("~/components/pages/admin/listmonk-diagnostic-section", () => ({
  ListmonkDiagnosticSection: () => (
    <div data-testid="listmonk-diagnostic-section" />
  ),
}))

vi.mock("~/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <button>{children}</button>
  ),
}))

vi.mock("~/components/ui/separator", () => ({
  Separator: () => <hr />,
}))

import type { Route } from "./+types/dashboard-page"
import AdminDashboard from "./dashboard-page"

type LoaderData = Route.ComponentProps["loaderData"]

const createMockComponentProps = (
  events: DashboardEvent[],
): Route.ComponentProps => {
  return {
    loaderData: {
      events: events as LoaderData["events"],
      recentProfiles: [] as LoaderData["recentProfiles"],
      recentFeedbacks: [] as LoaderData["recentFeedbacks"],
    },
    params: {},
    matches: [] as unknown as Route.ComponentProps["matches"],
  }
}

describe("AdminDashboard Component", () => {
  it("should show events table even when no active events exist", () => {
    const eventsWithNoActiveStatus: DashboardEvent[] = [
      {
        id: "event-1",
        title: "Scheduled Event",
        emoji: "📅",
        event_status: "Scheduled",
        time_event_start: "2024-03-01T10:00:00",
      },
      {
        id: "event-2",
        title: "Completed Event",
        emoji: "✅",
        event_status: "Completed",
        time_event_start: "2024-02-01T10:00:00",
      },
      {
        id: "event-3",
        title: "Cancelled Event",
        emoji: "❌",
        event_status: "Cancelled",
        time_event_start: "2024-01-01T10:00:00",
      },
    ]

    render(
      <AdminDashboard
        {...createMockComponentProps(eventsWithNoActiveStatus)}
      />,
    )

    expect(screen.getByTestId("events-table")).toBeInTheDocument()
    expect(screen.getByText("Todos os eventos")).toBeInTheDocument()
  })

  it("should show events table when active events exist", () => {
    const eventsWithActiveStatus: DashboardEvent[] = [
      {
        id: "event-1",
        title: "Registration Open Event",
        emoji: "🎉",
        event_status: "Registration Open",
        time_event_start: "2024-03-01T10:00:00",
      },
    ]

    render(
      <AdminDashboard {...createMockComponentProps(eventsWithActiveStatus)} />,
    )

    expect(screen.getByTestId("events-table")).toBeInTheDocument()
    expect(screen.getByText("Todos os eventos")).toBeInTheDocument()
  })

  it("should not show active events section when no active events exist", () => {
    const eventsWithNoActiveStatus: DashboardEvent[] = [
      {
        id: "event-1",
        title: "Scheduled Event",
        emoji: "📅",
        event_status: "Scheduled",
        time_event_start: "2024-03-01T10:00:00",
      },
    ]

    render(
      <AdminDashboard
        {...createMockComponentProps(eventsWithNoActiveStatus)}
      />,
    )

    expect(
      screen.queryByText("Eventos com candidaturas abertas"),
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId("event-card")).not.toBeInTheDocument()
  })

  it("should show active events section when active events exist", () => {
    const eventsWithActiveStatus: DashboardEvent[] = [
      {
        id: "event-1",
        title: "Registration Open Event",
        emoji: "🎉",
        event_status: "Registration Open",
        time_event_start: "2024-03-01T10:00:00",
      },
    ]

    render(
      <AdminDashboard {...createMockComponentProps(eventsWithActiveStatus)} />,
    )

    expect(
      screen.getByText(adminDashboardCopy.activeEventsTitle),
    ).toBeInTheDocument()
    expect(screen.getByTestId("event-card")).toBeInTheDocument()
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { getContext } from "~/business/auth/auth.server"
import { formatCalendarEvent } from "~/business/participant/format-calendar-event.server"
import { dashboardCopy } from "~/copy/dashboard"
import paths from "~/lib/paths"
import { redirectWithError } from "remix-toast"
import { loader } from "./download-calendar.route"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("remix-toast", () => ({
  redirectWithError: vi.fn(
    (path: string) =>
      new Response(null, { status: 302, headers: { Location: path } }),
  ),
}))

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("~/business/participant/format-calendar-event.server", () => ({
  formatCalendarEvent: vi.fn(),
}))

const runLoader = () =>
  loader({
    request: new Request("http://localhost/dashboard/calendar/event-1"),
    params: { eventId: "event-1" },
  } as Parameters<typeof loader>[0])

describe("download calendar loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: "event-1" }, error: null })
    vi.mocked(getContext).mockResolvedValue({
      supabase: {
        from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
      },
    } as unknown as Awaited<ReturnType<typeof getContext>>)
  })

  it("logs which event could not be turned into a calendar", async () => {
    vi.mocked(formatCalendarEvent).mockResolvedValue(undefined)

    await runLoader().catch(() => {})

    expect(logger.warn).toHaveBeenCalledWith(
      "Event is missing the fields a calendar needs",
      { eventId: "event-1" },
    )
  })
  it("redirects to the dashboard with a toast when the calendar cannot be built", async () => {
    vi.mocked(formatCalendarEvent).mockResolvedValue(undefined)

    const response = await runLoader().catch((thrown: unknown) => thrown)

    expect(response).toBeInstanceOf(Response)
    expect((response as Response).headers.get("Location")).toBe(
      paths.dash.DASHBOARD,
    )
    expect(redirectWithError).toHaveBeenCalledWith(
      paths.dash.DASHBOARD,
      dashboardCopy.calendarFailed,
    )
  })
})

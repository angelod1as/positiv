import { redirectWithError } from "remix-toast"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { findCalendarEvent } from "~/business/event/event.server"
import { formatCalendarEvent } from "~/business/event/format-calendar-event.server"
import { dashboardCopy } from "~/copy/dashboard"
import paths from "~/lib/paths"
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

vi.mock("~/business/event/event.server", () => ({
  findCalendarEvent: vi.fn(),
}))

vi.mock("~/business/event/format-calendar-event.server", () => ({
  formatCalendarEvent: vi.fn(),
}))

const runLoader = () =>
  loader({
    request: new Request(
      "http://localhost/dashboard/calendar/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c",
    ),
    params: { eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
  } as Parameters<typeof loader>[0])

describe("download calendar loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(findCalendarEvent).mockResolvedValue({
      id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c",
    } as Awaited<ReturnType<typeof findCalendarEvent>>)
  })

  it("logs which event could not be turned into a calendar", async () => {
    vi.mocked(formatCalendarEvent).mockResolvedValue(undefined)

    await expect(runLoader()).rejects.toBeInstanceOf(Response)

    expect(logger.warn).toHaveBeenCalledWith(
      "Event is missing the fields a calendar needs",
      { eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
    )
  })

  it("redirects to the dashboard with a toast when the calendar cannot be built", async () => {
    vi.mocked(formatCalendarEvent).mockResolvedValue(undefined)

    await expect(runLoader()).rejects.toSatisfy(
      (response: Response) =>
        response.headers.get("Location") === paths.dash.DASHBOARD,
    )
    expect(redirectWithError).toHaveBeenCalledWith(
      paths.dash.DASHBOARD,
      dashboardCopy.calendarFailed,
    )
  })
})

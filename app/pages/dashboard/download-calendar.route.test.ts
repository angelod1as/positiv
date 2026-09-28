import { beforeEach, describe, expect, it, vi } from "vitest"
import { getContext } from "~/business/auth/auth.server"
import { formatCalendarEvent } from "~/business/participant/format-calendar-event.server"
import { loader } from "./download-calendar.route"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

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

    await runLoader()

    expect(logger.warn).toHaveBeenCalledWith(
      "Event is missing the fields a calendar needs",
      { eventId: "event-1" },
    )
  })
})

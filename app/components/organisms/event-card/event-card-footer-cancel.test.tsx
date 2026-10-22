import { beforeEach, describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { renderWithRouter, screen } from "~/test/test-utils"
import { eventCardCopy } from "~/copy/events"
import { EventCardFooter } from "./event-card-footer"

const { mockSubmit, fetcher } = vi.hoisted(() => {
  const mockSubmit = vi.fn()
  // One object for every render, as the real hook gives: a new Form component
  // on each render would remount the dialog and close it while typing.
  const fetcher = {
    Form: ({ children }: { children: React.ReactNode }) => (
      <form>{children}</form>
    ),
    submit: mockSubmit,
    state: "idle",
    data: null,
  }
  return { mockSubmit, fetcher }
})

vi.mock("~/lib/hooks/use-analytics", () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}))

vi.mock("~/lib/hooks/use-smart-prefetch", () => ({
  useSmartPrefetch: () => "intent",
}))

// The real dialog this time, so the reason field is on screen. Only the
// fetcher is replaced, to see what the dialog submits.
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useFetcher: () => fetcher,
}))

const openCancelDialog = async () => {
  const user = userEvent.setup()
  renderWithRouter(
    <EventCardFooter
      eventId="event-123"
      event_status="Registration Open"
      googleLink=""
      is_applied={true}
      dataTestId="footer"
    />,
  )
  await user.click(
    screen.getByRole("button", { name: eventCardCopy.cancel.trigger }),
  )
  return user
}

const reasonField = () =>
  screen.getByRole("textbox", { name: eventCardCopy.cancel.reasonLabel })

describe("EventCardFooter cancel dialog", () => {
  beforeEach(() => {
    mockSubmit.mockReset()
    mockSubmit.mockResolvedValue(undefined)
  })

  it("asks for an optional reason", async () => {
    await openCancelDialog()

    expect(reasonField()).toBeInTheDocument()
    expect(reasonField()).not.toBeRequired()
  })

  it("caps the reason at 500 characters", async () => {
    await openCancelDialog()

    expect(reasonField()).toHaveAttribute("maxLength", "500")
  })

  it("sends the reason along with the cancellation", async () => {
    const user = await openCancelDialog()

    await user.type(reasonField(), "Vou viajar")
    await user.click(
      screen.getByRole("button", { name: eventCardCopy.cancel.confirmLabel }),
    )

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchId: "handleConfirmCancel",
        eventId: "event-123",
        reason: "Vou viajar",
      }),
      { method: "POST" },
    )
  })

  it("starts empty the next time the dialog opens after a cancellation", async () => {
    const user = await openCancelDialog()

    await user.type(reasonField(), "Vou viajar")
    await user.click(
      screen.getByRole("button", { name: eventCardCopy.cancel.confirmLabel }),
    )
    await user.click(
      screen.getByRole("button", { name: eventCardCopy.cancel.trigger }),
    )

    expect(reasonField()).toHaveValue("")
  })

  it("cancels with an empty reason when none was typed", async () => {
    const user = await openCancelDialog()

    await user.click(
      screen.getByRole("button", { name: eventCardCopy.cancel.confirmLabel }),
    )

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ fetchId: "handleConfirmCancel", reason: "" }),
      { method: "POST" },
    )
  })
})

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Demographics } from "~/business/admin/demographics/demographics"
import { adminEventsCopy } from "~/copy/admin/events"
import { DemographicsData } from "./demographics"

const commitJson = vi.hoisted(() => vi.fn())
const success = vi.hoisted(() => vi.fn())
const error = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())
const revalidate = vi.hoisted(() => vi.fn())

vi.mock("~/components/forms/runtime/commit-json", () => ({ commitJson }))
vi.mock("sonner", () => ({ toast: { success, error } }))

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
    useRevalidator: () => ({ revalidate }),
  }
})

const demographics = {
  total: 10,
  veteran: { yes: 40, no: 60 },
  gender: { cis: 50, trans: 50, other: { percentage: 0, values: [] } },
  orientation: {
    straight: 25,
    biPan: 25,
    homo: 25,
    aceDemi: 25,
    other: { percentage: 0, values: [] },
  },
  race_color: {
    yellow: 20,
    white: 20,
    indigenous: 20,
    brown: 20,
    black: 20,
    other: { percentage: 0, values: [] },
  },
  age: { min: 20, average: 30, max: 40 },
} as unknown as Demographics

const clickUpdate = async () => {
  await userEvent.click(
    screen.getByRole("button", { name: adminEventsCopy.demographics.update }),
  )
}

describe("DemographicsData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    commitJson.mockResolvedValue({ ok: true })
  })

  it("counts the event again through its own route", async () => {
    render(<DemographicsData demographics={demographics} eventId="event-1" />)

    await clickUpdate()

    expect(commitJson).toHaveBeenCalledWith(
      "/api/admin/event-demographics/event-1",
      {},
      expect.any(Function),
    )
  })

  it("says the count landed and reads the page again", async () => {
    render(<DemographicsData demographics={demographics} eventId="event-1" />)

    await clickUpdate()

    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        adminEventsCopy.toasts.demographicsUpdated,
      ),
    )
    expect(revalidate).toHaveBeenCalled()
  })

  it("says what the count was turned down for", async () => {
    commitJson.mockResolvedValue({
      ok: false,
      errors: [],
      message: "Demographics can only be updated for completed events",
    })
    render(<DemographicsData demographics={demographics} eventId="event-1" />)

    await clickUpdate()

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        "Demographics can only be updated for completed events",
      ),
    )
    expect(success).not.toHaveBeenCalled()
  })

  it("says the count failed when it never reached the server", async () => {
    commitJson.mockRejectedValue(new Error("offline"))
    render(<DemographicsData demographics={demographics} eventId="event-1" />)

    await clickUpdate()

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        adminEventsCopy.toasts.demographicsUpdateFailed,
      ),
    )
  })

  it("offers no button without an event to count", () => {
    render(<DemographicsData demographics={demographics} />)

    expect(
      screen.queryByRole("button", {
        name: adminEventsCopy.demographics.update,
      }),
    ).not.toBeInTheDocument()
  })
})

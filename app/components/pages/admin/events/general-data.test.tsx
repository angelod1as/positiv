import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { GeneralData } from "./general-data"

describe("GeneralData", () => {
  it("shows the location", () => {
    const event = {
      location: "Motel Harmony",
      ticket_price: null,
      total_spots: null,
    }

    render(<GeneralData {...event} />)

    expect(screen.getByText(/Motel Harmony/)).toBeInTheDocument()
  })
})

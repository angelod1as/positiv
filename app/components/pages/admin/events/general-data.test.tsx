import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { GeneralData } from "./general-data"

describe("GeneralData", () => {
  it("shows the location but not the event description", () => {
    const event = {
      description: "Para quem sobreviveu ao carnaval",
      location: "Motel Harmony",
      ticket_price: null,
      total_spots: null,
    }

    render(<GeneralData {...event} />)

    expect(screen.getByText(/Motel Harmony/)).toBeInTheDocument()
    expect(
      screen.queryByText(/Para quem sobreviveu ao carnaval/),
    ).not.toBeInTheDocument()
  })
})

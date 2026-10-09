import { describe, expect, it } from "vitest"
import { render } from "~/test/test-utils"
import { EventPrice } from "./event-price"

describe("EventPrice", () => {
  it("shows a single price when card payments are disabled", () => {
    const { getByText, queryByText } = render(<EventPrice base={25000} />)

    expect(getByText("R$ 250,00")).toBeInTheDocument()
    expect(queryByText("no Pix")).not.toBeInTheDocument()
  })

  it("leads with the discounted Pix price when card payments are enabled", () => {
    const { getByText } = render(
      <EventPrice base={25000} cardPaymentsEnabled />,
    )

    expect(getByText("R$ 225,00")).toBeInTheDocument()
    expect(getByText("no Pix · economize 10%")).toBeInTheDocument()
    expect(getByText("R$ 250,00 no cartão")).toBeInTheDocument()
  })

  it("floors the discounted Pix price to the cent", () => {
    const { getByText } = render(
      <EventPrice base={2409} cardPaymentsEnabled />,
    )

    expect(getByText("R$ 21,68")).toBeInTheDocument()
    expect(getByText("R$ 24,09 no cartão")).toBeInTheDocument()
  })
})

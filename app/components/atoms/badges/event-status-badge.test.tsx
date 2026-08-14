import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EventStatusBadge } from "./badges"

describe("EventStatusBadge", () => {
  it("says registration is open", () => {
    render(<EventStatusBadge event_status="Registration Open" />)
    expect(screen.getByText("Inscrições abertas")).toBeInTheDocument()
  })

  it("says the event is scheduled", () => {
    render(<EventStatusBadge event_status="Scheduled" />)
    expect(screen.getByText("Em breve")).toBeInTheDocument()
  })

  it("says registration is closed", () => {
    render(<EventStatusBadge event_status="Registration Closed" />)
    expect(screen.getByText("Inscrições encerradas")).toBeInTheDocument()
  })
})

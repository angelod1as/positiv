import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EventListSkeleton } from "./event-list-skeleton"

describe("EventListSkeleton", () => {
  it("mirrors the dashboard sections", () => {
    render(<EventListSkeleton />)

    expect(
      screen.getByRole("heading", { name: "Eventos em que você se candidatou" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Eventos da Positiv" }),
    ).toBeInTheDocument()
  })

  it("does not render the old status headings", () => {
    render(<EventListSkeleton />)

    expect(screen.queryByText("Candidaturas encerradas")).not.toBeInTheDocument()
    expect(screen.queryByText("Eventos agendados")).not.toBeInTheDocument()
  })
})

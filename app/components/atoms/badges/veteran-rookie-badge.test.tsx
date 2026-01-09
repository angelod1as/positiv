import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { VeteranRookieBadge } from "./veteran-rookie-badge"

describe("VeteranRookieBadge", () => {
  it("renders Veterane badge when isVeteran is true", () => {
    render(<VeteranRookieBadge isVeteran={true} />)

    const badge = screen.getByText("Veterane")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute("data-slot", "badge")
  })

  it("renders Novate badge when isVeteran is false", () => {
    render(<VeteranRookieBadge isVeteran={false} />)

    const badge = screen.getByText("Novate")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute("data-slot", "badge")
  })
})

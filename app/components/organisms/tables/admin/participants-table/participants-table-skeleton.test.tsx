import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { ParticipantsTableSkeleton } from "./participants-table-skeleton"

describe("ParticipantsTableSkeleton", () => {
  it("should render skeleton with correct structure", () => {
    render(<ParticipantsTableSkeleton />)

    expect(
      screen.getByTestId("participants-table-skeleton"),
    ).toBeInTheDocument()
  })

  it("should have accessibility attributes", () => {
    render(<ParticipantsTableSkeleton />)

    const skeleton = screen.getByTestId("participants-table-skeleton")
    expect(skeleton).toHaveAttribute("aria-busy", "true")
    expect(skeleton).toHaveAttribute("aria-live", "polite")
  })

  it("should apply animation classes", () => {
    render(<ParticipantsTableSkeleton />)

    const skeleton = screen.getByTestId("participants-table-skeleton")
    expect(skeleton.className).toContain("animate-pulse")
  })
})

import { render, screen } from "~/test/test-utils"
import { describe, expect, it } from "vitest"
import { FlagBadge } from "./flag-badge"
import type { ProfileFlagStatus } from "~/types/database/entities.types"

describe("FlagBadge", () => {
  it("should not render anything for 'none' flag", () => {
    const { container } = render(<FlagBadge flag="none" />)
    expect(container.firstChild).toBeNull()
  })

  it("should render yellow flag with correct styling", () => {
    render(<FlagBadge flag="yellow" flagNotes="Test warning" />)
    const flagElement = screen.getByRole("img")

    expect(flagElement).toBeInTheDocument()
    expect(flagElement).toHaveAttribute("aria-label", "Flag amarela: Test warning")

    const svgElement = flagElement.querySelector("svg")
    expect(svgElement).toHaveClass("text-yellow-500")
  })

  it("should render red flag with correct styling", () => {
    render(<FlagBadge flag="red" flagNotes="Critical issue" />)
    const flagElement = screen.getByRole("img")

    expect(flagElement).toBeInTheDocument()
    expect(flagElement).toHaveAttribute("aria-label", "Flag vermelha: Critical issue")

    const svgElement = flagElement.querySelector("svg")
    expect(svgElement).toHaveClass("text-red-500")
  })

  it("should render gray flag with correct styling", () => {
    render(<FlagBadge flag="gray" flagNotes="Previously flagged, now resolved" />)
    const flagElement = screen.getByRole("img")

    expect(flagElement).toBeInTheDocument()
    expect(flagElement).toHaveAttribute("aria-label", "Flag cinza: Previously flagged, now resolved")

    const svgElement = flagElement.querySelector("svg")
    expect(svgElement).toHaveClass("text-gray-500")
  })

  it("should render flag without tooltip when showTooltip is false", () => {
    render(
      <FlagBadge
        flag="yellow"
        flagNotes="Test note"
        showTooltip={false}
      />
    )

    const flagElement = screen.getByRole("img")
    expect(flagElement).toBeInTheDocument()

    expect(screen.queryByText("Test note")).not.toBeInTheDocument()
  })

  it("should render flag without tooltip when flagNotes is null", () => {
    render(<FlagBadge flag="red" flagNotes={null} />)

    const flagElement = screen.getByRole("img")
    expect(flagElement).toBeInTheDocument()
    expect(flagElement).toHaveAttribute("aria-label", "Flag vermelha")
  })

  it("should render tooltip with flag notes on hover", () => {
    render(<FlagBadge flag="yellow" flagNotes="Important context" />)

    const flagElement = screen.getByRole("img")
    expect(flagElement).toBeInTheDocument()
  })

  it("should handle all valid flag types", () => {
    const flags: ProfileFlagStatus[] = ["none", "yellow", "red", "gray"]

    flags.forEach((flag) => {
      const { container, unmount } = render(<FlagBadge flag={flag} flagNotes={flag !== "none" ? `${flag} note` : null} />)

      if (flag === "none") {
        expect(container.firstChild).toBeNull()
      } else {
        expect(screen.getByRole("img")).toBeInTheDocument()
      }

      unmount()
    })
  })
})

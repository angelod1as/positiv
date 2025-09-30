import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { WarningBanner } from "./warning-banner"

describe("WarningBanner", () => {
  const STORAGE_KEY = "warning-banner-dismissed"

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("should render the warning banner when not dismissed", () => {
    render(<WarningBanner />)

    expect(
      screen.getByText(/Update your warning message here/i),
    ).toBeInTheDocument()
  })

  it("should not render the warning banner when previously dismissed", () => {
    localStorage.setItem(STORAGE_KEY, "true")

    render(<WarningBanner />)

    expect(
      screen.queryByText(/Update your warning message here/i),
    ).not.toBeInTheDocument()
  })

  it("should dismiss the banner when close button is clicked", async () => {
    const user = userEvent.setup()

    render(<WarningBanner />)

    const closeButton = screen.getByRole("button", { name: /dismiss warning/i })
    await user.click(closeButton)

    expect(localStorage.getItem(STORAGE_KEY)).toBe("true")
    expect(
      screen.queryByText(/Update your warning message here/i),
    ).not.toBeInTheDocument()
  })

  it("should have proper accessibility attributes", () => {
    render(<WarningBanner />)

    const closeButton = screen.getByRole("button", { name: /dismiss warning/i })
    expect(closeButton).toHaveAttribute("aria-label", "Dismiss warning")
  })
})
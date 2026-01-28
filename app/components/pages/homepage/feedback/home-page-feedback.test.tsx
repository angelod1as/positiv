import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  }
})

import { HomePageFeedback } from "./home-page-feedback"

describe("HomePageFeedback", () => {
  it("should render the section title", () => {
    render(<HomePageFeedback />)

    expect(screen.getByText("Nos deixe um feedback")).toBeInTheDocument()
  })

  it("should render the description text", () => {
    render(<HomePageFeedback />)

    expect(
      screen.getByText(
        /Estamos sempre buscando melhorias em nossa comunicação e processo/,
      ),
    ).toBeInTheDocument()
  })

  it("should render a link button to the feedback page", () => {
    render(<HomePageFeedback />)

    const link = screen.getByRole("link", { name: /deixar feedback/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/feedback")
  })
})

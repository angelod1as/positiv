import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { Button } from "./button"

describe("Button", () => {
  it("should render as a link with prefetch when to prop is provided", () => {
    render(
      <MemoryRouter>
        <Button to="/test" linkProps={{ prefetch: "intent" }}>
          Test Button
        </Button>
      </MemoryRouter>,
    )

    const link = screen.getByRole("link", { name: "Test Button" })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/test")
    expect(link).toHaveAttribute("data-discover", "true")
  })

  it("should render as a regular button when to prop is not provided", () => {
    render(<Button>Test Button</Button>)

    const button = screen.getByRole("button", { name: "Test Button" })
    expect(button).toBeInTheDocument()
  })

  it("should pass prefetch prop through linkProps to Link component", () => {
    render(
      <MemoryRouter>
        <Button to="/dashboard" linkProps={{ prefetch: "render" }}>
          Go to Dashboard
        </Button>
      </MemoryRouter>,
    )

    const link = screen.getByRole("link", { name: "Go to Dashboard" })
    expect(link).toHaveAttribute("data-discover", "true")
  })
})

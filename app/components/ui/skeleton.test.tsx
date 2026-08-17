import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Skeleton } from "./skeleton"

describe("Skeleton", () => {
  it("keeps its own classes when given more", () => {
    render(<Skeleton className="h-10" data-testid="skeleton" />)

    const skeleton = screen.getByTestId("skeleton")
    expect(skeleton).toHaveClass("h-10")
    expect(skeleton).toHaveClass("animate-pulse")
  })

  it("is hidden from assistive technology", () => {
    render(<Skeleton data-testid="skeleton" />)

    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true")
  })
})

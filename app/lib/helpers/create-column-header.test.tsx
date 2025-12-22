import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { createColumnHeader } from "./create-column-header"

describe("createColumnHeader", () => {
  describe("simple header without tooltip", () => {
    it("should render plain text when no options provided", () => {
      const header = createColumnHeader("Nome")
      render(<div>{header}</div>)

      expect(screen.getByText("Nome")).toBeInTheDocument()
    })

    it("should wrap text in span element", () => {
      const header = createColumnHeader("Nome")
      const { container } = render(<div>{header}</div>)

      const span = container.querySelector("span")
      expect(span).toBeInTheDocument()
      expect(span?.textContent).toBe("Nome")
    })
  })

  describe("header with tooltip", () => {
    it("should render header with info icon when tooltip provided", () => {
      const header = createColumnHeader("Vet ou Nov?", {
        tooltip: "O número ao lado da badge...",
      })
      const { container } = render(<div>{header}</div>)

      expect(screen.getByText("Vet ou Nov?")).toBeInTheDocument()
      const icon = container.querySelector(".cursor-help")
      expect(icon).toBeInTheDocument()
    })

    it("should show tooltip content on hover", async () => {
      const user = userEvent.setup()
      const tooltipText =
        "O número ao lado da badge Veterane indica quantos eventos"

      const header = createColumnHeader("Vet ou Nov?", {
        tooltip: tooltipText,
      })
      const { container } = render(<div>{header}</div>)

      const trigger = container.querySelector(".cursor-help")
      expect(trigger).toBeInTheDocument()

      if (!trigger) throw new Error("Trigger not found")
      await user.hover(trigger)

      const tooltips = await screen.findAllByText(tooltipText)
      expect(tooltips.length).toBeGreaterThan(0)
    })

    it("should apply default styling to icon", () => {
      const header = createColumnHeader("Test", {
        tooltip: "Test tooltip",
      })
      const { container } = render(<div>{header}</div>)

      const icon = container.querySelector("svg")
      expect(icon).toHaveClass("h-3.5")
      expect(icon).toHaveClass("w-3.5")
      expect(icon).toHaveClass("text-gray-500")
      expect(icon).toHaveClass("cursor-help")
    })

    it("should apply default max-width to tooltip content", async () => {
      const user = userEvent.setup()
      const header = createColumnHeader("Test", {
        tooltip: "Long tooltip text",
      })
      const { container } = render(<div>{header}</div>)

      const trigger = container.querySelector(".cursor-help")
      expect(trigger).toBeInTheDocument()

      if (!trigger) throw new Error("Trigger not found")
      await user.hover(trigger)

      const maxWElements = document.querySelectorAll("div.max-w-xs")
      expect(maxWElements.length).toBeGreaterThan(0)
    })

    it("should render ReactNode tooltip content with formatting", async () => {
      const user = userEvent.setup()
      const header = createColumnHeader("Test", {
        tooltip: (
          <>
            <p>First paragraph</p>
            <p>
              <b>Bold text</b> in second paragraph
            </p>
          </>
        ),
      })
      const { container } = render(<div>{header}</div>)

      const trigger = container.querySelector(".cursor-help")
      expect(trigger).toBeInTheDocument()

      if (!trigger) throw new Error("Trigger not found")
      await user.hover(trigger)

      const firstParagraphs = await screen.findAllByText("First paragraph")
      expect(firstParagraphs.length).toBeGreaterThan(0)

      const boldTexts = await screen.findAllByText("Bold text")
      expect(boldTexts.length).toBeGreaterThan(0)
      expect(boldTexts[0].tagName).toBe("B")
    })

    it("should use flex layout with gap when tooltip present", () => {
      const header = createColumnHeader("Test", {
        tooltip: "Tooltip",
      })
      const { container } = render(<div>{header}</div>)

      const wrapper = container.querySelector(".flex.items-center.gap-1")
      expect(wrapper).toBeInTheDocument()
    })

    it("should not use flex layout without tooltip", () => {
      const header = createColumnHeader("Test")
      const { container } = render(<div>{header}</div>)

      const wrapper = container.querySelector(".flex")
      expect(wrapper).not.toBeInTheDocument()
    })
  })

  describe("customization options", () => {
    it("should use custom icon when provided", () => {
      const CustomIcon = ({ className }: { className?: string }) => (
        <svg className={className} data-testid="custom-icon" />
      )

      const header = createColumnHeader("Test", {
        tooltip: "Tooltip",
        icon: CustomIcon,
      })
      const { container } = render(<div>{header}</div>)

      const customIcon = container.querySelector('[data-testid="custom-icon"]')
      expect(customIcon).toBeInTheDocument()
      expect(customIcon).toHaveClass("h-3.5")
      expect(customIcon).toHaveClass("w-3.5")
      expect(customIcon).toHaveClass("text-gray-500")
      expect(customIcon).toHaveClass("cursor-help")
    })

    it("should apply custom tooltipMaxWidth", async () => {
      const user = userEvent.setup()
      const header = createColumnHeader("Test", {
        tooltip: "Tooltip",
        tooltipMaxWidth: "max-w-md",
      })
      const { container } = render(<div>{header}</div>)

      const trigger = container.querySelector(".cursor-help")
      expect(trigger).toBeInTheDocument()

      if (!trigger) throw new Error("Trigger not found")
      await user.hover(trigger)

      const tooltipContent = document.querySelector("div.max-w-md")
      expect(tooltipContent).toBeInTheDocument()
    })

    it("should apply custom delayDuration", () => {
      const header = createColumnHeader("Test", {
        tooltip: "Tooltip",
        delayDuration: 500,
      })
      render(<div>{header}</div>)

      // We can't easily test the delay duration in the test,
      // but we can at least verify the component renders without error
      expect(screen.getByText("Test")).toBeInTheDocument()
    })
  })
})

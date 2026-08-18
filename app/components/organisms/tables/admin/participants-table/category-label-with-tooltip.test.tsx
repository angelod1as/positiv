import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { TooltipProvider } from "~/components/ui/tooltip"
import { render, screen } from "~/test/test-utils"
import { CategoryLabelWithTooltip } from "./category-label-with-tooltip"

function renderWithTooltip(ui: React.ReactNode) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>)
}

describe("CategoryLabelWithTooltip", () => {
  describe("rendering", () => {
    it("should render label text", () => {
      renderWithTooltip(
        <CategoryLabelWithTooltip
          label="Geral"
          tooltipContent="Test content"
        />
      )

      expect(screen.getByText("Geral:")).toBeInTheDocument()
    })

    it("should render label with colon", () => {
      renderWithTooltip(
        <CategoryLabelWithTooltip
          label="Aceites no processo"
          tooltipContent="Test content"
        />
      )

      expect(screen.getByText("Aceites no processo:")).toBeInTheDocument()
    })

    it("should render help icon", () => {
      const { container } = renderWithTooltip(
        <CategoryLabelWithTooltip
          label="Geral"
          tooltipContent="Test content"
        />
      )

      const icon = container.querySelector(".cursor-help")
      expect(icon).toBeInTheDocument()
    })
  })

  describe("tooltip behavior", () => {
    it("should show tooltip content on hover", async () => {
      const user = userEvent.setup()
      const tooltipText = "Total de todas as candidaturas"

      const { container } = renderWithTooltip(
        <CategoryLabelWithTooltip label="Geral" tooltipContent={tooltipText} />
      )

      const trigger = container.querySelector(".cursor-help")
      expect(trigger).toBeInTheDocument()

      if (!trigger) throw new Error("Trigger not found")
      await user.hover(trigger)

      const tooltips = await screen.findAllByText(tooltipText)
      expect(tooltips.length).toBeGreaterThan(0)
    })

    it("should support multiline tooltip content", async () => {
      const user = userEvent.setup()
      const tooltipContent = (
        <>
          <p>Linha 1</p>
          <p>Linha 2</p>
        </>
      )

      const { container } = renderWithTooltip(
        <CategoryLabelWithTooltip label="Test" tooltipContent={tooltipContent} />
      )

      const trigger = container.querySelector(".cursor-help")
      if (!trigger) throw new Error("Trigger not found")
      await user.hover(trigger)

      const linha1 = await screen.findAllByText("Linha 1")
      const linha2 = await screen.findAllByText("Linha 2")
      expect(linha1.length).toBeGreaterThan(0)
      expect(linha2.length).toBeGreaterThan(0)
    })
  })

  describe("accessibility", () => {
    it("should have cursor-help class on trigger", () => {
      const { container } = renderWithTooltip(
        <CategoryLabelWithTooltip label="Geral" tooltipContent="Content" />
      )

      const icon = container.querySelector(".cursor-help")
      expect(icon).toBeInTheDocument()
    })

    it("should render in flex layout with proper spacing", () => {
      const { container } = renderWithTooltip(
        <CategoryLabelWithTooltip label="Geral" tooltipContent="Content" />
      )

      const wrapper = container.querySelector(".flex.items-center.gap-1")
      expect(wrapper).toBeInTheDocument()
    })
  })

  describe("styling", () => {
    it("should apply correct icon size", () => {
      const { container } = renderWithTooltip(
        <CategoryLabelWithTooltip label="Geral" tooltipContent="Content" />
      )

      const icon = container.querySelector("svg")
      expect(icon).toHaveClass("h-3.5")
      expect(icon).toHaveClass("w-3.5")
    })

    it("should apply text-gray-500 to icon", () => {
      const { container } = renderWithTooltip(
        <CategoryLabelWithTooltip label="Geral" tooltipContent="Content" />
      )

      const icon = container.querySelector("svg")
      expect(icon).toHaveClass("text-gray-500")
    })
  })
})

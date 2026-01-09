import type { ICellRendererParams } from "ag-grid-community"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { PhoneButtonRenderer } from "./phone-button-renderer"

function createMockParams(
  phone: number | null | undefined,
): ICellRendererParams {
  return {
    value: phone,
    valueFormatted: String(phone ?? ""),
    data: { id: "1", phone },
    node: {} as ICellRendererParams["node"],
    colDef: { field: "phone" },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context: {},
    getValue: () => phone ?? "",
    setValue: () => {},
    formatValue: () => String(phone ?? ""),
    refreshCell: () => {},
    eGridCell: document.createElement("div"),
    eParentOfValue: document.createElement("div"),
    registerRowDragger: () => {},
    setTooltip: () => {},
  }
}

function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>)
}

describe("PhoneButtonRenderer", () => {
  describe("when phone is provided", () => {
    it("renders a WhatsApp button", () => {
      const params = createMockParams(11999887766)

      renderWithRouter(<PhoneButtonRenderer {...params} />)

      const button = screen.getByRole("link")
      expect(button).toBeInTheDocument()
    })

    it("renders WhatsApp icon", () => {
      const params = createMockParams(11999887766)

      renderWithRouter(<PhoneButtonRenderer {...params} />)

      const icon = screen.getByAltText("WhatsApp")
      expect(icon).toBeInTheDocument()
    })

    it("links to WhatsApp with correct phone number", () => {
      const params = createMockParams(11999887766)

      renderWithRouter(<PhoneButtonRenderer {...params} />)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "https://wa.me/5511999887766")
    })

    it("opens link in new tab", () => {
      const params = createMockParams(11999887766)

      renderWithRouter(<PhoneButtonRenderer {...params} />)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("target", "_blank")
    })
  })

  describe("edge cases", () => {
    it("renders nothing when phone is null", () => {
      const params = createMockParams(null)

      const { container } = renderWithRouter(
        <PhoneButtonRenderer {...params} />,
      )

      expect(container).toBeEmptyDOMElement()
    })

    it("renders nothing when phone is undefined", () => {
      const params = createMockParams(undefined)

      const { container } = renderWithRouter(
        <PhoneButtonRenderer {...params} />,
      )

      expect(container).toBeEmptyDOMElement()
    })
  })
})

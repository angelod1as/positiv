import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BrowserRouter } from "react-router"
import { FloatingWhatsappButton } from "./floating-whatsapp-button"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe("FloatingWhatsappButton", () => {
  it("should render the component", () => {
    renderWithRouter(<FloatingWhatsappButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    expect(link).toBeInTheDocument()
  })

  it("should have correct WhatsApp link with phone number", () => {
    renderWithRouter(<FloatingWhatsappButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    expect(link).toHaveAttribute("href")
    const href = link.getAttribute("href")
    expect(href).toContain(`wa.me/${POSITIV_WHATSAPP}`)
  })

  it("should include pre-filled message in Portuguese", () => {
    renderWithRouter(<FloatingWhatsappButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    const href = link.getAttribute("href")
    expect(href).toContain("text=")
    expect(href).toContain("Ol%C3%A1")
  })

  it("should open in new tab", () => {
    renderWithRouter(<FloatingWhatsappButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("should have proper accessibility attributes", () => {
    renderWithRouter(<FloatingWhatsappButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    expect(link).toHaveAccessibleName()
  })

  it("should display WhatsApp icon", () => {
    renderWithRouter(<FloatingWhatsappButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    const img = link.querySelector("img")
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("alt", "WhatsApp")
  })

  it("should have fixed positioning classes", () => {
    const { container } = renderWithRouter(<FloatingWhatsappButton />)
    const button = container.firstChild as HTMLElement
    expect(button.className).toContain("fixed")
  })
})

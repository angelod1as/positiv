import { render, screen } from "~/test/test-utils"
import { BrowserRouter } from "react-router"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"
import { FloatingWhatsAppButton } from "./floating-whatsapp-button"

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }))

vi.mock("~/lib/hooks/use-analytics", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe("FloatingWhatsAppButton", () => {
  it("should render the component", () => {
    renderWithRouter(<FloatingWhatsAppButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    expect(link).toBeInTheDocument()
  })

  it("should have correct WhatsApp link with phone number", () => {
    renderWithRouter(<FloatingWhatsAppButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    expect(link).toHaveAttribute("href")
    const href = link.getAttribute("href")
    expect(href).toContain(`wa.me/${POSITIV_WHATSAPP}`)
  })

  it("should include pre-filled message in Portuguese", () => {
    renderWithRouter(<FloatingWhatsAppButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    const href = link.getAttribute("href")
    expect(href).toContain("text=")
    expect(href).toContain("Ol%C3%A1")
  })

  it("should open in new tab", () => {
    renderWithRouter(<FloatingWhatsAppButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("should have proper accessibility attributes", () => {
    renderWithRouter(<FloatingWhatsAppButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    expect(link).toHaveAccessibleName()
  })

  it("should display WhatsApp icon", () => {
    renderWithRouter(<FloatingWhatsAppButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    const img = link.querySelector("img")
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("alt", "WhatsApp")
  })

  it("should have fixed positioning classes", () => {
    const { container } = renderWithRouter(<FloatingWhatsAppButton />)
    const button = container.firstChild as HTMLElement
    expect(button.className).toContain("fixed")
  })

  it("records a click on the button", async () => {
    renderWithRouter(<FloatingWhatsAppButton />)
    const link = screen.getByRole("link", { name: /fale conosco/i })
    // jsdom cannot follow the link, and says so loudly.
    link.addEventListener("click", (event) => event.preventDefault())

    await userEvent.click(link)

    expect(mockTrack).toHaveBeenCalledWith("outbound_link_clicked", {
      destination: "whatsapp",
      area: "floating_button",
    })
  })
})

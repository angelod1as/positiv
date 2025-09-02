import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { MDXComponentsDocs } from "./mdx-components-docs"

describe("MDXComponentsDocs", () => {
  beforeEach(() => {
    // Clear the clipboard mock before each test
    if (navigator.clipboard && navigator.clipboard.writeText) {
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockClear?.()
    }
  })

  it("should render the trigger button", () => {
    render(<MDXComponentsDocs />)
    
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    expect(triggerButton).toBeInTheDocument()
  })

  it("should open drawer when trigger button is clicked", async () => {
    const user = userEvent.setup()
    render(<MDXComponentsDocs />)
    
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    await user.click(triggerButton)
    
    expect(screen.getByText("Componentes MDX Disponíveis")).toBeInTheDocument()
    expect(screen.getByText("Copie e cole estes componentes no conteúdo da sua newsletter")).toBeInTheDocument()
  })

  it("should display all MDX components documentation", async () => {
    const user = userEvent.setup()
    render(<MDXComponentsDocs />)
    
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    await user.click(triggerButton)
    
    // Check for component names
    expect(screen.getByText("EventCard")).toBeInTheDocument()
    expect(screen.getByText("Button")).toBeInTheDocument()
    expect(screen.getByText("Divider")).toBeInTheDocument()
    expect(screen.getByText("Quote")).toBeInTheDocument()
    
    // Check for component descriptions
    expect(screen.getByText("Exibe informações de um evento com destaque visual")).toBeInTheDocument()
    expect(screen.getByText("Botão de call-to-action com link")).toBeInTheDocument()
    expect(screen.getByText("Linha divisória para separar seções")).toBeInTheDocument()
    expect(screen.getByText("Citação em destaque com autor opcional")).toBeInTheDocument()
  })

  it("should display component previews", async () => {
    const user = userEvent.setup()
    render(<MDXComponentsDocs />)
    
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    await user.click(triggerButton)
    
    // Check for preview sections
    const previewLabels = screen.getAllByText("Pré-visualização:")
    expect(previewLabels).toHaveLength(4) // One for each component
  })

  it("should display component code examples", async () => {
    const user = userEvent.setup()
    render(<MDXComponentsDocs />)
    
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    await user.click(triggerButton)
    
    // Check for MDX code examples
    expect(screen.getByText(/title="Festival de Verão"/)).toBeInTheDocument()
    expect(screen.getByText(/href="https:\/\/positiv.com\/events"/)).toBeInTheDocument()
    expect(screen.getByText(/<Divider \/>/)).toBeInTheDocument()
    expect(screen.getByText(/author="João Silva"/)).toBeInTheDocument()
  })

  it("should display component parameters table", async () => {
    const user = userEvent.setup()
    render(<MDXComponentsDocs />)
    
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    await user.click(triggerButton)
    
    // Check for parameter headers
    const nameHeaders = screen.getAllByText("Nome")
    const typeHeaders = screen.getAllByText("Tipo")
    const requiredHeaders = screen.getAllByText("Obrigatório")
    const descriptionHeaders = screen.getAllByText("Descrição")
    
    // Should have at least 3 tables (EventCard, Button, Quote have parameters)
    expect(nameHeaders.length).toBeGreaterThanOrEqual(3)
    expect(typeHeaders.length).toBeGreaterThanOrEqual(3)
    expect(requiredHeaders.length).toBeGreaterThanOrEqual(3)
    expect(descriptionHeaders.length).toBeGreaterThanOrEqual(3)
    
    // Check for specific parameters
    expect(screen.getByText("title")).toBeInTheDocument()
    expect(screen.getByText("date")).toBeInTheDocument()
    expect(screen.getByText("location")).toBeInTheDocument()
    expect(screen.getByText("spots")).toBeInTheDocument()
    expect(screen.getByText("href")).toBeInTheDocument()
    expect(screen.getByText("author")).toBeInTheDocument()
  })

  it.skip("should copy code to clipboard when copy button is clicked", async () => {
    const user = userEvent.setup()
    
    render(<MDXComponentsDocs />)
    
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    await user.click(triggerButton)
    
    // Find the first copy button
    const copyButtons = screen.getAllByRole("button", { name: /copiar/i })
    expect(copyButtons.length).toBeGreaterThan(0)
    
    // Click the first copy button
    await user.click(copyButtons[0])
    
    // Wait for the async clipboard operation
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1)
    })
    
    // Check that clipboard was called with the EventCard code
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("<EventCard")
    )
    
    // Check that button text changes to "Copiado!"
    await waitFor(() => {
      expect(screen.getByText("Copiado!")).toBeInTheDocument()
    })
  })

  it("should display usage tips", async () => {
    const user = userEvent.setup()
    render(<MDXComponentsDocs />)
    
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    await user.click(triggerButton)
    
    // Check for usage tips section
    expect(screen.getByText("💡 Dica de Uso")).toBeInTheDocument()
    expect(screen.getByText(/Você também pode usar Markdown padrão/)).toBeInTheDocument()
  })

  it("should close drawer when close button is clicked", async () => {
    const user = userEvent.setup()
    render(<MDXComponentsDocs />)
    
    // Open the drawer
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    await user.click(triggerButton)
    
    // Verify drawer is open
    expect(screen.getByText("Componentes MDX Disponíveis")).toBeInTheDocument()
    
    // Find and click the close button (X icon)
    const closeButton = screen.getByRole("button", { name: /close/i })
    await user.click(closeButton)
    
    // Verify drawer is closed
    await waitFor(() => {
      expect(screen.queryByText("Componentes MDX Disponíveis")).not.toBeInTheDocument()
    })
  })

  it("should mark optional parameters correctly", async () => {
    const user = userEvent.setup()
    render(<MDXComponentsDocs />)
    
    const triggerButton = screen.getByRole("button", { name: /componentes mdx/i })
    await user.click(triggerButton)
    
    // Find the Quote component's author parameter row
    // It should be marked as "Não" (not required)
    const authorParam = screen.getByText("author")
    const authorRow = authorParam.closest("tr")
    
    if (authorRow) {
      const notRequiredText = authorRow.querySelector(".text-gray-500")
      expect(notRequiredText?.textContent).toBe("Não")
    }
  })
})
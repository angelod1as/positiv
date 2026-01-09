import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import { EventBdsmConsentPage } from "./event-bdsm-consent"

// Mock the SchemaForm component to avoid React Router dependencies in tests
let mockFormState = { showError: false, isChecked: false }

vi.mock("~/components/forms/base/schema-form", () => ({
  SchemaForm: ({
    children,
    _schema,
    values,
    inputTypes,
    labels,
    buttonLabel,
  }: {
    children: (props: {
      Field: React.FC<{ name: string }>
      Button: React.FC<{ alignment?: string }>
      Errors: React.FC
    }) => React.ReactNode
    _schema: unknown
    values?: Record<string, unknown>
    inputTypes?: Record<string, string>
    labels?: Record<string, string>
    buttonLabel?: string
  }) => {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!mockFormState.isChecked) {
        mockFormState.showError = true
      }
    }

    const renderProps = {
      Field: ({ name }: { name: string }) => (
        <label>
          <input
            type={inputTypes?.[name] || "text"}
            name={name}
            defaultChecked={(values?.[name] as boolean) || false}
            aria-label={labels?.[name]}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              mockFormState.isChecked = e.target.checked
              mockFormState.showError = false
            }}
          />
          {labels?.[name]}
        </label>
      ),
      Errors: () =>
        mockFormState.showError ? (
          <div data-testid="errors">Você deve aceitar para continuar</div>
        ) : null,
      Button: ({ alignment }: { alignment?: string }) => (
        <button type="submit" className={alignment}>
          {buttonLabel}
        </button>
      ),
    }
    return <form onSubmit={handleSubmit}>{children(renderProps)}</form>
  },
}))

// Reset mock state before each test
beforeEach(() => {
  mockFormState = { showError: false, isChecked: false }
})

describe("EventBdsmConsentPage", () => {
  it("renders the page title", () => {
    render(<EventBdsmConsentPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Essa é uma edição BDSM da Positiv",
    )
  })

  it("renders all content sections", () => {
    render(<EventBdsmConsentPage />)

    expect(
      screen.getByText(/Antes de começar, gostaríamos de deixar claro/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "BDSM essentials" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Limitações" }),
    ).toBeInTheDocument()
  })

  it("displays the Alert component with correct variant", () => {
    render(<EventBdsmConsentPage />)

    const alert = screen.getByRole("alert")
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/Importante:/)
    expect(alert).toHaveTextContent(
      /terminantemente proibido o uso de qualquer substância/,
    )
  })

  it("renders position descriptions correctly", () => {
    render(<EventBdsmConsentPage />)

    // Check for the position terms
    expect(screen.getByText("top:")).toBeInTheDocument()
    expect(screen.getByText("bottom:")).toBeInTheDocument()
    expect(screen.getByText("switcher:")).toBeInTheDocument()

    // Check for the descriptions
    expect(screen.getByText(/pessoa que comanda a sessão/)).toBeInTheDocument()
    expect(
      screen.getByText(/pessoa que está como receptora/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/pessoa que gosta de ser tanto/),
    ).toBeInTheDocument()
  })

  it("renders prohibited practices list", () => {
    render(<EventBdsmConsentPage />)

    // Check that the limitations heading exists
    expect(
      screen.getByRole("heading", { name: "Limitações" }),
    ).toBeInTheDocument()

    // Check for practice names
    expect(screen.getByText("Scat:")).toBeInTheDocument()
    expect(screen.getByText("Golden Shower e Pissing:")).toBeInTheDocument()
    expect(screen.getByText("Waxplay:")).toBeInTheDocument()
    expect(screen.getByText("Içamento:")).toBeInTheDocument()
    expect(screen.getByText("Eletroestimulação:")).toBeInTheDocument()
    expect(screen.getByText("Rape play:")).toBeInTheDocument()
  })

  it("renders the external link to BDSM test", () => {
    render(<EventBdsmConsentPage />)

    const link = screen.getByRole("link", { name: /bdsmtest\.org/ })
    expect(link).toHaveAttribute("href", "https://bdsmtest.org/select-lang")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("renders the consent checkbox unchecked by default", () => {
    render(<EventBdsmConsentPage />)

    const checkbox = screen.getByRole("checkbox", {
      name: "Estou ciente e quero continuar",
    })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it("renders the submit button", () => {
    render(<EventBdsmConsentPage />)

    const button = screen.getByRole("button", { name: "Continuar" })
    expect(button).toBeInTheDocument()
  })

  it("shows validation error when trying to submit without consent", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<EventBdsmConsentPage />)

    const button = screen.getByRole("button", { name: "Continuar" })
    await user.click(button)

    // Force re-render to show error state
    rerender(<EventBdsmConsentPage />)

    expect(screen.getByTestId("errors")).toBeInTheDocument()
    expect(
      screen.getByText("Você deve aceitar para continuar"),
    ).toBeInTheDocument()
  })

  it("allows form submission when consent is checked", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<EventBdsmConsentPage />)

    const checkbox = screen.getByRole("checkbox", {
      name: "Estou ciente e quero continuar",
    })
    await user.click(checkbox)

    expect(checkbox).toBeChecked()

    const button = screen.getByRole("button", { name: "Continuar" })
    await user.click(button)

    // Force re-render to check error state is not shown
    rerender(<EventBdsmConsentPage />)

    expect(screen.queryByTestId("errors")).not.toBeInTheDocument()
    expect(
      screen.queryByText("Você deve aceitar para continuar"),
    ).not.toBeInTheDocument()
  })

  it("renders all important warnings and aftercare information", () => {
    render(<EventBdsmConsentPage />)

    expect(
      screen.getByText(
        "Vamos começar do começo: Não existe BDSM sem consentimento!",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/aftercare/)).toBeInTheDocument()
    expect(screen.getByText(/é fundamental/)).toBeInTheDocument()

    // Check for drop text - there are multiple instances, so use getAllByText
    const dropElements = screen.getAllByText(/drop/)
    expect(dropElements.length).toBeGreaterThan(0)

    expect(screen.getByText(/sentimento de depressão/)).toBeInTheDocument()
  })
})

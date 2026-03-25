import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const createMockFetcher = (
  overrides?: Partial<{
    state: "idle" | "submitting" | "loading"
    data: unknown
  }>,
) => ({
  submit: vi.fn(),
  state: overrides?.state ?? ("idle" as const),
  formData: undefined,
  data: overrides?.data ?? undefined,
  formAction: undefined,
  formMethod: undefined,
  formEncType: undefined,
  text: undefined,
  json: undefined,
  key: "",
  Form: () => null,
  load: vi.fn(),
})

let mockFetcher = createMockFetcher()

vi.mock("react-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router")>()
  return {
    ...original,
    useFetcher: () => mockFetcher,
  }
})

function renderWithRouter(element: React.ReactElement) {
  const router = createMemoryRouter(
    [{ path: "/", element }],
    { initialEntries: ["/"] },
  )
  return render(<RouterProvider router={router} />)
}

describe("ListmonkDiagnosticSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetcher = createMockFetcher()
  })

  it("should render section title and description", async () => {
    const { ListmonkDiagnosticSection } = await import(
      "./listmonk-diagnostic-section"
    )

    renderWithRouter(<ListmonkDiagnosticSection />)

    expect(
      screen.getByRole("heading", { name: /diagnóstico de email/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/testa a conexão com o serviço de newsletter/i),
    ).toBeInTheDocument()
  })

  it("should render test button", async () => {
    const { ListmonkDiagnosticSection } = await import(
      "./listmonk-diagnostic-section"
    )

    renderWithRouter(<ListmonkDiagnosticSection />)

    expect(
      screen.getByRole("button", { name: /testar conexão com listmonk/i }),
    ).toBeInTheDocument()
  })

  it("should show loading state when fetcher is submitting", async () => {
    mockFetcher = createMockFetcher({ state: "submitting" })

    const { ListmonkDiagnosticSection } = await import(
      "./listmonk-diagnostic-section"
    )

    renderWithRouter(<ListmonkDiagnosticSection />)

    expect(screen.getByText(/testando/i)).toBeInTheDocument()
  })

  it("should open confirm dialog when button is clicked", async () => {
    const user = userEvent.setup()

    const { ListmonkDiagnosticSection } = await import(
      "./listmonk-diagnostic-section"
    )

    renderWithRouter(<ListmonkDiagnosticSection />)

    await user.click(
      screen.getByRole("button", { name: /testar conexão com listmonk/i }),
    )

    expect(
      screen.getByText(/será enviado um email de teste/i),
    ).toBeInTheDocument()
  })
})

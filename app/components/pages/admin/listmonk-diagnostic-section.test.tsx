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

type FetcherOverrides = Partial<{
  state: "idle" | "submitting" | "loading"
  data: unknown
}>

const createMockFetcher = (overrides?: FetcherOverrides) => ({
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

let fetcherConfigs: [FetcherOverrides | undefined, FetcherOverrides | undefined] = [
  undefined,
  undefined,
]

vi.mock("react-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router")>()
  return {
    ...original,
    useFetcher: (() => {
      let instanceIndex = 0
      return () => {
        const index = instanceIndex
        instanceIndex = (instanceIndex + 1) % 2
        return createMockFetcher(fetcherConfigs[index])
      }
    })(),
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
    fetcherConfigs = [undefined, undefined]
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

  it("should render test button but not cleanup button initially", async () => {
    const { ListmonkDiagnosticSection } = await import(
      "./listmonk-diagnostic-section"
    )

    renderWithRouter(<ListmonkDiagnosticSection />)

    expect(
      screen.getByRole("button", { name: /testar conexão com listmonk/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /limpar campanha/i }),
    ).not.toBeInTheDocument()
  })

  it("should show loading state when test fetcher is submitting", async () => {
    fetcherConfigs = [{ state: "submitting" }, undefined]

    const { ListmonkDiagnosticSection } = await import(
      "./listmonk-diagnostic-section"
    )

    renderWithRouter(<ListmonkDiagnosticSection />)

    expect(screen.getByText(/testando/i)).toBeInTheDocument()
  })

  it("should open confirm dialog when test button is clicked", async () => {
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

  it("should show cleanup button after successful test with campaignId", async () => {
    fetcherConfigs = [
      {
        data: {
          intent: "test-listmonk",
          diagnosticResult: {
            success: true,
            campaignId: 99,
            steps: [
              { label: "Conexão estabelecida", status: "ok" },
              { label: "Campanha de teste criada", status: "ok" },
              { label: "Email enviado para devs", status: "ok" },
            ],
          },
        },
      },
      undefined,
    ]

    const { ListmonkDiagnosticSection } = await import(
      "./listmonk-diagnostic-section"
    )

    renderWithRouter(<ListmonkDiagnosticSection />)

    expect(
      screen.getByRole("button", { name: /limpar campanha/i }),
    ).toBeInTheDocument()
  })

  it("should not show cleanup button after failed test with no campaignId", async () => {
    fetcherConfigs = [
      {
        data: {
          intent: "test-listmonk",
          diagnosticResult: {
            success: false,
            campaignId: null,
            steps: [
              { label: "Conexão estabelecida", status: "error", error: "fail" },
            ],
          },
        },
      },
      undefined,
    ]

    const { ListmonkDiagnosticSection } = await import(
      "./listmonk-diagnostic-section"
    )

    renderWithRouter(<ListmonkDiagnosticSection />)

    expect(
      screen.queryByRole("button", { name: /limpar campanha/i }),
    ).not.toBeInTheDocument()
  })
})

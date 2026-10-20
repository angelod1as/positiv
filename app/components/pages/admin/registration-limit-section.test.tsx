import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RegistrationLimitSection } from "./registration-limit-section"

const fetcher = vi.hoisted(() => ({
  submit: vi.fn(),
  state: "idle",
  data: undefined as { intent: string; error?: string } | undefined,
}))

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useFetcher: () => fetcher,
}))

const limitInput = () =>
  screen.getByRole("spinbutton", {
    name: "Candidaturas que fecham as inscrições",
  })

describe("RegistrationLimitSection", () => {
  beforeEach(() => {
    fetcher.submit.mockClear()
    fetcher.data = undefined
  })

  it("shows the current limit and that cis het men do not count", () => {
    render(<RegistrationLimitSection limit={90} />)

    expect(
      screen.getByRole("heading", { name: "Limite de candidaturas" }),
    ).toBeInTheDocument()
    expect(limitInput()).toHaveValue(90)
    expect(
      screen.getByText(/Homens cis hétero podem se candidatar/),
    ).toBeInTheDocument()
  })

  it("saves the limit the admin types", async () => {
    render(<RegistrationLimitSection limit={90} />)

    await userEvent.clear(limitInput())
    await userEvent.type(limitInput(), "120")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(fetcher.submit).toHaveBeenCalledWith(
      { intent: "set-registration-limit", limit: "120" },
      { method: "POST" },
    )
  })

  it("follows a new limit from the loader", () => {
    const { rerender } = render(<RegistrationLimitSection limit={90} />)

    rerender(<RegistrationLimitSection limit={120} />)

    expect(limitInput()).toHaveValue(120)
  })

  it("shows why a limit was refused", () => {
    fetcher.data = {
      intent: "set-registration-limit",
      error: "O limite precisa ser um número inteiro entre 1 e 10.000.",
    }

    render(<RegistrationLimitSection limit={90} />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "O limite precisa ser um número inteiro entre 1 e 10.000.",
    )
  })
})

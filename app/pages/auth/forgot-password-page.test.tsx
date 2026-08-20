import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => navigate }
})

import { toast } from "sonner"
import ForgotPasswordPage from "./forgot-password-page"

type PageProps = Parameters<typeof ForgotPasswordPage>[0]

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/entrar/esqueci"]}>
      <ForgotPasswordPage {...({} as PageProps)} />
    </MemoryRouter>,
  )

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Entrar" }))

const answers = (result: unknown, init?: ResponseInit) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(result, init) as Response)

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    navigate.mockClear()
    vi.mocked(toast.success).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("asks for an e-mail and nothing else", () => {
    renderPage()

    expect(screen.getByLabelText("E-mail")).toBeVisible()
    expect(screen.getByRole("button", { name: "Entrar" })).toBeVisible()
  })

  it("refuses an empty form without asking the server", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true })
    renderPage()

    await submit(user)

    expect(await screen.findByText("Campo obrigatório")).toBeVisible()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends the address to the reset route", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true })
    renderPage()

    await user.type(screen.getByLabelText("E-mail"), "pessoa@exemplo.com")
    await submit(user)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/auth/esqueci-senha")
    expect(JSON.parse(String(init.body))).toEqual({
      email: "pessoa@exemplo.com",
    })
  })

  it("says a link is on its way and returns to the login", async () => {
    const user = userEvent.setup()
    answers({ ok: true })
    renderPage()

    await user.type(screen.getByLabelText("E-mail"), "pessoa@exemplo.com")
    await submit(user)

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/entrar"))
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("link"),
      expect.anything(),
    )
  })

  it("says the request was refused, and stays put", async () => {
    const user = userEvent.setup()
    answers(
      { ok: false, errors: [], message: "Não foi possível enviar" },
      { status: 422 },
    )
    renderPage()

    await user.type(screen.getByLabelText("E-mail"), "pessoa@exemplo.com")
    await submit(user)

    expect(await screen.findByText("Não foi possível enviar")).toBeVisible()
    expect(navigate).not.toHaveBeenCalled()
  })
})

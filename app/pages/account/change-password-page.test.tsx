import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
  getUserContext: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => navigate }
})

import { toast } from "sonner"
import ChangePasswordPage from "./change-password-page"

type PageProps = Parameters<typeof ChangePasswordPage>[0]

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/conta/mudar-senha"]}>
      <ChangePasswordPage {...({} as PageProps)} />
    </MemoryRouter>,
  )

const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  { confirm = "segredo123" }: { confirm?: string } = {},
) => {
  await user.type(screen.getByLabelText("Nova senha"), "segredo123")
  await user.type(screen.getByLabelText("Confirmar senha"), confirm)
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Mudar senha" }))

const answers = (result: unknown, init?: ResponseInit) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(result, init) as Response)

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    navigate.mockClear()
    vi.mocked(toast.success).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("asks for the new password twice, on one screen", () => {
    renderPage()

    expect(screen.getByLabelText("Nova senha")).toHaveAttribute(
      "type",
      "password",
    )
    expect(screen.getByLabelText("Confirmar senha")).toHaveAttribute(
      "type",
      "password",
    )
    expect(screen.getByRole("button", { name: "Mudar senha" })).toBeVisible()
  })

  it("refuses an empty form without asking the server", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true })
    renderPage()

    await submit(user)

    expect(await screen.findAllByText("Campo obrigatório")).toHaveLength(2)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("refuses two passwords that differ without asking the server", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true })
    renderPage()

    await fill(user, { confirm: "outra-senha" })
    await submit(user)

    expect(await screen.findByText("As senhas não combinam")).toBeVisible()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends the new password to the change route", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true })
    renderPage()

    await fill(user)
    await submit(user)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/account/mudar-senha")
    expect(JSON.parse(String(init.body))).toEqual({
      password: "segredo123",
      confirm_password: "segredo123",
    })
  })

  it("returns to the account once the password changed", async () => {
    const user = userEvent.setup()
    answers({ ok: true })
    renderPage()

    await fill(user)
    await submit(user)

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/conta"))
    expect(toast.success).toHaveBeenCalled()
  })

  it("says why the change was refused, and stays put", async () => {
    const user = userEvent.setup()
    answers(
      {
        ok: false,
        errors: [],
        message: "Será que essa não era a sua senha? Tente outra.",
      },
      { status: 422 },
    )
    renderPage()

    await fill(user)
    await submit(user)

    expect(
      await screen.findByText("Será que essa não era a sua senha? Tente outra."),
    ).toBeVisible()
    expect(navigate).not.toHaveBeenCalled()
  })
})

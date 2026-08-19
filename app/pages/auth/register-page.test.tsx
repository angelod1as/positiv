import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" onClick={() => onSuccess("token-de-teste")}>
      Resolver captcha
    </button>
  ),
}))

vi.mock("~/lib/helpers/get-turnstile-config.server", () => ({
  getTurnstileConfig: () => ({ siteKey: "site-key" }),
}))

// The page reads its site key from the loader and leaves on success. Neither
// belongs to a test of the form itself, and this project's jsdom cannot run a
// data router's loader at all.
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    useLoaderData: () => ({ turnstileSiteKey: "site-key" }),
    useNavigate: () => navigate,
  }
})

import RegisterPage from "./register-page"

type PageProps = Parameters<typeof RegisterPage>[0]

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/registrar"]}>
      <RegisterPage {...({} as PageProps)} />
    </MemoryRouter>,
  )

const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  { confirm = "segredo123" }: { confirm?: string } = {},
) => {
  await user.type(screen.getByLabelText("E-mail"), "pessoa@exemplo.com")
  await user.type(screen.getByLabelText("Senha"), "segredo123")
  await user.type(screen.getByLabelText("Confirme a senha"), confirm)
  await user.click(
    screen.getByRole("checkbox", { name: "Sou maior de 18 anos" }),
  )
  await user.click(screen.getByRole("button", { name: "Resolver captcha" }))
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Continuar" }))

describe("RegisterPage", () => {
  beforeEach(() => {
    navigate.mockClear()
    vi.spyOn(globalThis, "fetch")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows every field on one screen", () => {
    renderPage()

    expect(screen.getByLabelText("E-mail")).toBeVisible()
    expect(screen.getByLabelText("Senha")).toBeVisible()
    expect(screen.getByLabelText("Confirme a senha")).toBeVisible()
    expect(
      screen.getByRole("checkbox", { name: "Sou maior de 18 anos" }),
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Continuar" })).toBeVisible()
  })

  it("masks both password fields", () => {
    renderPage()

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password")
    expect(screen.getByLabelText("Confirme a senha")).toHaveAttribute(
      "type",
      "password",
    )
  })

  it("refuses mismatched passwords without asking the server", async () => {
    const user = userEvent.setup()
    renderPage()

    await fill(user, { confirm: "outra-senha" })
    await submit(user)

    expect(await screen.findByText("As senhas não são iguais")).toBeVisible()
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("refuses to send anything until the captcha has answered", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText("E-mail"), "pessoa@exemplo.com")
    await user.type(screen.getByLabelText("Senha"), "segredo123")
    await user.type(screen.getByLabelText("Confirme a senha"), "segredo123")
    await user.click(
      screen.getByRole("checkbox", { name: "Sou maior de 18 anos" }),
    )
    await submit(user)

    // An untouched captcha reports the shared "required" copy; the wording
    // about the security check is what an expired token gets, and that path
    // belongs to the question's own test.
    expect(await screen.findByText("Campo obrigatório")).toBeVisible()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it("sends the answers to the commit route and leaves when it accepts", async () => {
    const user = userEvent.setup()
    vi.mocked(globalThis.fetch).mockResolvedValue(Response.json({ ok: true }))
    renderPage()

    await fill(user)
    await submit(user)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({ method: "POST" }),
      )
    })

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "pessoa@exemplo.com",
      password: "segredo123",
      confirmPassword: "segredo123",
      over18: true,
      captchaToken: "token-de-teste",
    })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/registrar/confirmar-email")
    })
  })

  it("shows a server rejection under the question it names, keeping the answers", async () => {
    const user = userEvent.setup()
    vi.mocked(globalThis.fetch).mockResolvedValue(
      Response.json({
        ok: false,
        errors: [
          {
            questionId: "email",
            message: "Houve um erro no cadastro da sua conta.",
          },
        ],
      }),
    )
    renderPage()

    await fill(user)
    await submit(user)

    expect(
      await screen.findByText("Houve um erro no cadastro da sua conta."),
    ).toBeVisible()
    expect(screen.getByLabelText("E-mail")).toHaveValue("pessoa@exemplo.com")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("says the save failed when the server blames no question", async () => {
    const user = userEvent.setup()
    vi.mocked(globalThis.fetch).mockResolvedValue(
      Response.json({ ok: false, errors: [] }),
    )
    renderPage()

    await fill(user)
    await submit(user)

    expect(
      await screen.findByText("Não foi possível salvar agora. Tente novamente."),
    ).toBeVisible()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("never writes the answers to storage", async () => {
    const user = userEvent.setup()
    renderPage()

    await fill(user)

    expect(sessionStorage.length).toBe(0)
  })
  it("gives the security check's label a control to point at", () => {
    renderPage()

    // The presentation draws a label for every question. Without an id on the
    // control the runtime cannot see, that label would reference nothing.
    const mirror = document.querySelector('input[name="captchaToken"]')
    expect(mirror).toHaveAttribute("id", "captchaToken")

    const label = document.querySelector('label[for="captchaToken"]')
    expect(label).toHaveTextContent("Verificação de segurança")
  })

  it("keeps the e-mail hint the old form showed", () => {
    renderPage()

    expect(screen.getByLabelText("E-mail")).toHaveAttribute(
      "placeholder",
      "email@exemplo.com",
    )
  })
})

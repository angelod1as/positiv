import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), warning: vi.fn() },
}))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => navigate }
})

import { toast } from "sonner"
import type { Route } from "./+types/agree-to-terms-page"
import AgreeToTermsPage from "./agree-to-terms-page"

const EXPECTED_HEADINGS = [
  "O que é a Positiv?",
  "Próximos passos",
  "Entradas sociais",
  "Política de reembolso",
]

const createProps = (
  mktEmails: boolean | undefined = undefined,
): Route.ComponentProps =>
  ({
    loaderData: { mktEmails },
    params: {},
    matches: [] as unknown as Route.ComponentProps["matches"],
  }) as Route.ComponentProps

const renderPage = (mktEmails?: boolean) =>
  render(
    <MemoryRouter initialEntries={["/conta/termos-e-condicoes"]}>
      <AgreeToTermsPage {...createProps(mktEmails)} />
    </MemoryRouter>,
  )

const box = (name: string) => screen.getByRole("checkbox", { name })

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Continuar" }))

const answers = (result: unknown, init?: ResponseInit) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(result, init) as Response)

describe("AgreeToTermsPage", () => {
  beforeEach(() => {
    navigate.mockClear()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.warning).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders no accidental code blocks", () => {
    const { container } = renderPage()

    expect(container.querySelector("pre")).toBeNull()
    expect(container.querySelector("code")).toBeNull()
  })

  it("renders section headings in copy order", () => {
    renderPage()

    const renderedHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)

    expect(renderedHeadings).toEqual(EXPECTED_HEADINGS)
  })

  it("renders the refund list structure", () => {
    const { container } = renderPage()

    expect(container.querySelectorAll("ul")).toHaveLength(3)
    expect(container.querySelectorAll("li")).toHaveLength(8)
  })

  it("opens with the system e-mails ticked and the terms not", () => {
    renderPage()

    expect(box("Li tudo e estou de acordo!")).not.toBeChecked()
    expect(box("Aceito receber e-mails gerais do sistema")).toBeChecked()
  })

  it("opens with the newsletter as the person last left it", () => {
    renderPage(false)

    expect(box("Aceito receber e-mails sobre a Positiv")).not.toBeChecked()
  })

  it("opens with the newsletter ticked when nobody has said otherwise", () => {
    renderPage(undefined)

    expect(box("Aceito receber e-mails sobre a Positiv")).toBeChecked()
  })

  it("explains what the two e-mail choices mean", () => {
    renderPage()

    expect(screen.getByText(/processo de candidatura/)).toBeVisible()
    expect(screen.getByText(/outros eventos e parcerias/)).toBeVisible()
  })

  it("refuses to continue until the terms are agreed to", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true, newsletterFailed: false })
    renderPage()

    await submit(user)

    expect(
      await screen.findByText("Você só pode continuar se estiver de acordo."),
    ).toBeVisible()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends the choices to the terms route", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true, newsletterFailed: false })
    renderPage(true)

    await user.click(box("Li tudo e estou de acordo!"))
    await user.click(box("Aceito receber e-mails sobre a Positiv"))
    await submit(user)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/account/termos")
    expect(JSON.parse(String(init.body))).toEqual({
      agree: true,
      commonEmails: true,
      mktEmails: false,
    })
  })

  it("moves on to the basic data once the choices are saved", async () => {
    const user = userEvent.setup()
    answers({ ok: true, newsletterFailed: false })
    renderPage()

    await user.click(box("Li tudo e estou de acordo!"))
    await submit(user)

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/conta/dados-basicos"),
    )
    expect(toast.success).toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it("warns that the newsletter did not go through, and moves on anyway", async () => {
    const user = userEvent.setup()
    answers({ ok: true, newsletterFailed: true })
    renderPage()

    await user.click(box("Li tudo e estou de acordo!"))
    await submit(user)

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/conta/dados-basicos"),
    )
    expect(toast.warning).toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("says why the save was refused, and stays put", async () => {
    const user = userEvent.setup()
    answers(
      { ok: false, errors: [], message: "Problema ao criar perfil" },
      { status: 422 },
    )
    renderPage()

    await user.click(box("Li tudo e estou de acordo!"))
    await submit(user)

    expect(await screen.findByText("Problema ao criar perfil")).toBeVisible()
    expect(navigate).not.toHaveBeenCalled()
  })
})

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
import type { EmailPreferences } from "~/business/newsletter/email-preferences-schema"
import type { Route } from "./+types/agree-to-terms-page"
import AgreeToTermsPage from "./agree-to-terms-page"

const EXPECTED_HEADINGS = [
  "O que é a Positiv?",
  "Próximos passos",
  "Entradas sociais",
  "Política de reembolso",
]

const ALL_TICKED: EmailPreferences = {
  registrationAlerts: true,
  newsletter: true,
  marketing: true,
}

const createProps = (
  preferences: EmailPreferences = ALL_TICKED,
): Route.ComponentProps =>
  ({
    loaderData: { preferences },
    params: {},
    matches: [] as unknown as Route.ComponentProps["matches"],
  }) as Route.ComponentProps

const renderPage = (preferences?: EmailPreferences) =>
  render(
    <MemoryRouter initialEntries={["/conta/termos-e-condicoes"]}>
      <AgreeToTermsPage {...createProps(preferences)} />
    </MemoryRouter>,
  )

const ALERTS = "Quero ser avisade quando abrirem as inscrições das festas."
const NEWSLETTER = "Quero receber a newsletter da Positiv."
const MARKETING = "Aceito receber divulgações e parcerias."

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

  it("links to the privacy policy before the person agrees", () => {
    renderPage()

    expect(
      screen.getByRole("link", { name: "Política de Privacidade" }),
    ).toHaveAttribute("href", "/privacidade")
  })

  it("opens with the three email categories ticked and the terms not", () => {
    renderPage()

    expect(box("Li tudo e estou de acordo!")).not.toBeChecked()
    expect(box(ALERTS)).toBeChecked()
    expect(box(NEWSLETTER)).toBeChecked()
    expect(box(MARKETING)).toBeChecked()
  })

  it("opens with the email categories as the person last left them", () => {
    renderPage({ registrationAlerts: true, newsletter: false, marketing: false })

    expect(box(ALERTS)).toBeChecked()
    expect(box(NEWSLETTER)).not.toBeChecked()
    expect(box(MARKETING)).not.toBeChecked()
  })

  it("says which emails are always sent", () => {
    renderPage()

    expect(screen.getByText(/Sempre vamos te mandar e-mails/)).toBeVisible()
  })

  it("warns, right below the box, what unticking the alerts costs", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(box(ALERTS))

    expect(screen.getByRole("status")).toHaveTextContent(
      "Sem isso, você não vai mais ser lembrade das festas.",
    )
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

  it("sends someone whose session expired back to the sign-in", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      redirected: true,
      url: "http://localhost/entrar",
      json: async () => ({}),
    } as Response)
    renderPage()

    await user.click(box("Li tudo e estou de acordo!"))
    await submit(user)

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/entrar"))
  })

  it("sends the choices to the terms route", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true, newsletterFailed: false })
    renderPage()

    await user.click(box("Li tudo e estou de acordo!"))
    await user.click(box(NEWSLETTER))
    await submit(user)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/account/termos")
    expect(JSON.parse(String(init.body))).toEqual({
      agree: true,
      registrationAlerts: true,
      newsletter: false,
      marketing: true,
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

  it("warns that the email lists did not go through, and moves on anyway", async () => {
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

  describe("analytics", () => {
    const umamiTrack = vi.fn()

    beforeEach(() => {
      umamiTrack.mockClear()
      window.umami = { track: umamiTrack }
    })

    afterEach(() => {
      delete window.umami
    })

    it("sends terms_accepted once the choices are saved", async () => {
      const user = userEvent.setup()
      answers({ ok: true, newsletterFailed: false })
      renderPage()

      await user.click(box("Li tudo e estou de acordo!"))
      await submit(user)

      await waitFor(() =>
        expect(umamiTrack).toHaveBeenCalledWith("terms_accepted", undefined),
      )
    })

    it("sends nothing when the save is refused", async () => {
      const user = userEvent.setup()
      answers(
        { ok: false, errors: [], message: "Problema ao criar perfil" },
        { status: 422 },
      )
      renderPage()

      await user.click(box("Li tudo e estou de acordo!"))
      await submit(user)

      await screen.findByText("Problema ao criar perfil")
      expect(umamiTrack).not.toHaveBeenCalled()
    })
  })
})

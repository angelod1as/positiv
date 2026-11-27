import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/profile/likert-answers.server", () => ({
  canSeeLikert: vi.fn(),
}))

vi.mock("~/business/cms/likert-scale-cache.server", () => ({
  likertScaleCache: { get: vi.fn() },
}))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => navigate }
})

import { getUserContext } from "~/business/auth/auth.server"
import { likertScaleCache } from "~/business/cms/likert-scale-cache.server"
import { canSeeLikert } from "~/business/profile/likert-answers.server"
import { likertPageCopy } from "~/copy/account"
import LikertAnswerPage, { loader } from "./likert-answer-page"

type PageProps = Parameters<typeof LikertAnswerPage>[0]
type LoaderArgs = Parameters<typeof loader>[0]

const statements = [
  { key: "ciume", text: "Sinto ciúme e tudo bem." },
  { key: "consentimento", text: "Pergunto antes de tocar." },
]

const currentProfile = { id: "profile-1", permissions: [] }

const EVENT_ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"

const runLoader = (search = "") =>
  loader({
    request: new Request(`http://localhost/conta/escala/responder${search}`),
    params: {},
  } as unknown as LoaderArgs)

const renderPage = (
  loaderData: PageProps["loaderData"] = {
    statements,
    profileId: "profile-1",
    eventId: null,
  },
) =>
  render(
    <MemoryRouter initialEntries={["/conta/escala/responder"]}>
      <LikertAnswerPage {...({ loaderData } as PageProps)} />
    </MemoryRouter>,
  )

const answers = (result: unknown, init?: ResponseInit) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(result, init) as Response)

const answerScreen = async (
  user: ReturnType<typeof userEvent.setup>,
  choice: string,
) => {
  await user.click(await screen.findByRole("radio", { name: choice }))
  await user.click(screen.getByRole("button", { name: "Continuar" }))
}

describe("LikertAnswerPage loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserContext).mockResolvedValue({
      currentProfile,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>)
  })

  it("hands the page the published statements and whose run it is", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(true)
    vi.mocked(likertScaleCache.get).mockResolvedValue({ statements })

    expect(await runLoader()).toEqual({
      statements,
      profileId: "profile-1",
      eventId: null,
    })
  })

  it("hands the page the event the person was applying to", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(true)
    vi.mocked(likertScaleCache.get).mockResolvedValue({ statements })

    expect(await runLoader(`?evento=${EVENT_ID}`)).toEqual({
      statements,
      profileId: "profile-1",
      eventId: EVENT_ID,
    })
  })

  it("turns away an event that is not an id", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(true)
    vi.mocked(likertScaleCache.get).mockResolvedValue({ statements })

    await expect(runLoader("?evento=nope")).rejects.toMatchObject({
      status: 404,
    })
  })

  it("hands no statements when the scale is not published", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(true)
    vi.mocked(likertScaleCache.get).mockResolvedValue(null)

    expect(await runLoader()).toEqual({
      statements: null,
      profileId: "profile-1",
      eventId: null,
    })
  })

  it("sends someone who may not see the scale back to the account", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(false)

    const result = await runLoader()

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get("Location")).toBe("/conta")
  })

  it("sends someone signed out back to the account", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(true)
    vi.mocked(getUserContext).mockResolvedValue({
      currentProfile: null,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>)

    const result = await runLoader()

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get("Location")).toBe("/conta")
  })
})

describe("LikertAnswerPage", () => {
  beforeEach(() => {
    navigate.mockClear()
    sessionStorage.clear()
    localStorage.clear()
    // The highest draw leaves every statement where it is, so a test reads
    // them in Sanity's order unless it asks for a shuffle.
    vi.spyOn(Math, "random").mockReturnValue(0.999)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("asks one statement at a time, starting with the first", async () => {
    renderPage()

    expect(
      await screen.findByRole("heading", { name: "Sinto ciúme e tudo bem." }),
    ).toBeVisible()
    expect(screen.queryByText("Pergunto antes de tocar.")).toBeNull()
    expect(screen.getByText("1/2")).toBeVisible()
  })

  it("sends every answer, keyed by statement, and returns to the history", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true })
    renderPage()

    await answerScreen(user, "Concordo")
    await answerScreen(user, "Discordo totalmente")

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/conta/escala"))
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/account/escala")
    expect(JSON.parse(String(init.body))).toEqual({
      ciume: { choice: "agree" },
      consentimento: { choice: "strongly_disagree" },
    })
  })

  it("says why the scale comes before the application", async () => {
    renderPage({ statements, profileId: "profile-1", eventId: EVENT_ID })

    expect(
      await screen.findByText(likertPageCopy.beforeApplying),
    ).toBeVisible()
  })

  it("keeps quiet about applications when nobody was applying", async () => {
    renderPage()

    await screen.findByRole("heading", { name: "Sinto ciúme e tudo bem." })
    expect(screen.queryByText(likertPageCopy.beforeApplying)).toBeNull()
  })

  it("returns to the application once the answers are sent", async () => {
    const user = userEvent.setup()
    answers({ ok: true })
    renderPage({ statements, profileId: "profile-1", eventId: EVENT_ID })

    await answerScreen(user, "Concordo")
    await answerScreen(user, "Discordo totalmente")

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(`/dashboard/${EVENT_ID}/regras`),
    )
  })

  it("says why a save was refused", async () => {
    const user = userEvent.setup()
    answers({ ok: false, errors: [], message: "A escala mudou." }, { status: 422 })
    renderPage({
      statements: statements.slice(0, 1),
      profileId: "profile-1",
      eventId: null,
    })

    await answerScreen(user, "Depende")

    expect(await screen.findByText("A escala mudou.")).toBeVisible()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("starts over when the scale changed since the draft was kept", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true })
    const { unmount } = renderPage()
    await answerScreen(user, "Concordo")
    unmount()

    renderPage({
      statements: statements.slice(1),
      profileId: "profile-1",
      eventId: null,
    })
    await answerScreen(user, "Depende")

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      consentimento: { choice: "depends" },
    })
  })

  it("starts over when a statement was reworded since the draft was kept", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true })
    const { unmount } = renderPage()
    await answerScreen(user, "Concordo")
    unmount()

    const reworded = [
      { key: "ciume", text: "Sinto ciúme e falo sobre isso." },
      statements[1],
    ]
    renderPage({
      statements: reworded,
      profileId: "profile-1",
      eventId: null,
    })

    expect(
      await screen.findByRole("heading", {
        name: "Sinto ciúme e falo sobre isso.",
      }),
    ).toBeVisible()
    expect(screen.getByText("1/2")).toBeVisible()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends someone whose session expired back to the sign-in", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      redirected: true,
      url: "http://localhost/entrar",
      json: async () => ({}),
    } as Response)
    renderPage({
      statements: statements.slice(0, 1),
      profileId: "profile-1",
      eventId: null,
    })

    await answerScreen(user, "Depende")

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/entrar"))
    expect(navigate).not.toHaveBeenCalledWith("/conta/escala")
  })

  it("keeps the run when the server answers with something else", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>erro</html>", {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }),
    )
    renderPage({
      statements: statements.slice(0, 1),
      profileId: "profile-1",
      eventId: null,
    })

    await answerScreen(user, "Depende")

    expect(
      await screen.findByText("Não foi possível salvar agora. Tente novamente."),
    ).toBeVisible()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("asks the statements in an order drawn at random", async () => {
    vi.mocked(Math.random).mockReturnValue(0)
    renderPage()

    expect(
      await screen.findByRole("heading", { name: "Pergunto antes de tocar." }),
    ).toBeVisible()
  })

  it("comes back, after the tab closed, to the first statement still unanswered", async () => {
    const user = userEvent.setup()
    const three = [
      ...statements,
      { key: "limites", text: "Falo dos meus limites." },
    ]
    const { unmount } = renderPage({
      statements: three,
      profileId: "profile-1",
      eventId: null,
    })
    await answerScreen(user, "Concordo")
    await answerScreen(user, "Depende")
    await user.click(screen.getByRole("button", { name: "Voltar" }))
    await user.click(screen.getByRole("button", { name: "Voltar" }))
    unmount()
    sessionStorage.clear()

    vi.mocked(Math.random).mockReturnValue(0)
    renderPage({
      statements: three,
      profileId: "profile-1",
      eventId: null,
    })

    expect(
      await screen.findByRole("heading", { name: "Falo dos meus limites." }),
    ).toBeVisible()
    expect(screen.getByText("3/3")).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Voltar" }))
    expect(
      screen.getByRole("heading", { name: "Pergunto antes de tocar." }),
    ).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Voltar" }))
    expect(
      screen.getByRole("heading", { name: "Sinto ciúme e tudo bem." }),
    ).toBeVisible()
  })

  it("does not count a statement with only a comment as answered", async () => {
    const user = userEvent.setup()
    const three = [
      ...statements,
      { key: "limites", text: "Falo dos meus limites." },
    ]
    const { unmount } = renderPage({
      statements: three,
      profileId: "profile-1",
      eventId: null,
    })
    await answerScreen(user, "Concordo")
    await user.type(
      await screen.findByRole("textbox", { name: /Comentário/ }),
      "ainda pensando",
    )
    unmount()

    renderPage({
      statements: three,
      profileId: "profile-1",
      eventId: null,
    })

    expect(
      await screen.findByRole("heading", { name: "Pergunto antes de tocar." }),
    ).toBeVisible()
    expect(screen.getByText("2/3")).toBeVisible()
  })

  it("keeps the run in place when the loader hands the same statements again", async () => {
    const user = userEvent.setup()
    const three = [
      ...statements,
      { key: "limites", text: "Falo dos meus limites." },
    ]
    const { rerender } = renderPage({
      statements: three,
      profileId: "profile-1",
      eventId: null,
    })
    await answerScreen(user, "Concordo")
    await user.click(screen.getByRole("button", { name: "Voltar" }))

    vi.mocked(Math.random).mockReturnValue(0)
    rerender(
      <MemoryRouter initialEntries={["/conta/escala/responder"]}>
        <LikertAnswerPage
          {...({
            loaderData: {
              statements: three.map((statement) => ({ ...statement })),
              profileId: "profile-1",
            },
          } as PageProps)}
        />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole("heading", { name: "Sinto ciúme e tudo bem." }),
    ).toBeVisible()
    expect(screen.getByText("1/3")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Continuar" }))
    expect(
      screen.getByRole("heading", { name: "Pergunto antes de tocar." }),
    ).toBeVisible()
  })

  it("draws a new order for the next run once the answers are sent", async () => {
    const user = userEvent.setup()
    answers({ ok: true })
    const { unmount } = renderPage()
    await answerScreen(user, "Concordo")
    await answerScreen(user, "Depende")
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/conta/escala"))
    unmount()

    vi.mocked(Math.random).mockReturnValue(0)
    renderPage()

    expect(
      await screen.findByRole("heading", { name: "Pergunto antes de tocar." }),
    ).toBeVisible()
    expect(screen.getByText("1/2")).toBeVisible()
  })

  it("answers from the keyboard", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole("heading", { name: "Sinto ciúme e tudo bem." })

    await user.keyboard("4{Enter}")

    expect(
      await screen.findByRole("heading", { name: "Pergunto antes de tocar." }),
    ).toBeVisible()
  })

  it("explains the keyboard shortcuts in a dialog", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole("heading", { name: "Sinto ciúme e tudo bem." })

    await user.click(
      screen.getByRole("button", { name: "Use o teclado para preencher" }),
    )

    const dialog = screen.getByRole("dialog", { name: "Preencher pelo teclado" })
    expect(dialog).toHaveTextContent("Ctrl + Enter")
    expect(dialog).toHaveTextContent("Esc")

    await user.keyboard("4")
    expect(
      screen.getByRole("radio", { name: "Concordo", hidden: true }),
    ).not.toBeChecked()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  // jsdom matches no media query, so the class is the only witness here: a
  // touch screen has no keyboard, and the shortcuts would only confuse.
  it("offers the keyboard help only where there is a mouse or trackpad", async () => {
    renderPage()

    const link = await screen.findByRole("button", {
      name: "Use o teclado para preencher",
    })
    expect(link).toHaveClass("hidden", "pointer-fine:inline")
  })

  it("says the scale is unavailable when nothing is published", () => {
    renderPage({
      statements: null,
      profileId: "profile-1",
      eventId: null,
    })

    expect(
      screen.getByText(
        "A escala não está disponível agora. Tente de novo mais tarde.",
      ),
    ).toBeVisible()
    expect(screen.queryByRole("radio")).toBeNull()
  })
})

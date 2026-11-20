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
import LikertAnswerPage, { loader } from "./likert-answer-page"

type PageProps = Parameters<typeof LikertAnswerPage>[0]
type LoaderArgs = Parameters<typeof loader>[0]

const statements = [
  { key: "ciume", text: "Sinto ciúme e tudo bem." },
  { key: "consentimento", text: "Pergunto antes de tocar." },
]

const currentProfile = { id: "profile-1", permissions: [] }

const runLoader = () =>
  loader({
    request: new Request("http://localhost/conta/escala/responder"),
    params: {},
  } as unknown as LoaderArgs)

const renderPage = (
  loaderData: PageProps["loaderData"] = {
    statements,
    profileId: "profile-1",
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

    expect(await runLoader()).toEqual({ statements, profileId: "profile-1" })
  })

  it("hands no statements when the scale is not published", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(true)
    vi.mocked(likertScaleCache.get).mockResolvedValue(null)

    expect(await runLoader()).toEqual({
      statements: null,
      profileId: "profile-1",
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

  it("says why a save was refused", async () => {
    const user = userEvent.setup()
    answers({ ok: false, errors: [], message: "A escala mudou." }, { status: 422 })
    renderPage({ statements: statements.slice(0, 1), profileId: "profile-1" })

    await answerScreen(user, "Depende")

    expect(await screen.findByText("A escala mudou.")).toBeVisible()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("sends someone whose session expired back to the sign-in", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      redirected: true,
      url: "http://localhost/entrar",
      json: async () => ({}),
    } as Response)
    renderPage({ statements: statements.slice(0, 1), profileId: "profile-1" })

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
    renderPage({ statements: statements.slice(0, 1), profileId: "profile-1" })

    await answerScreen(user, "Depende")

    expect(
      await screen.findByText("Não foi possível salvar agora. Tente novamente."),
    ).toBeVisible()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("says the scale is unavailable when nothing is published", () => {
    renderPage({ statements: null, profileId: "profile-1" })

    expect(
      screen.getByText(
        "A escala não está disponível agora. Tente de novo mais tarde.",
      ),
    ).toBeVisible()
    expect(screen.queryByRole("radio")).toBeNull()
  })
})

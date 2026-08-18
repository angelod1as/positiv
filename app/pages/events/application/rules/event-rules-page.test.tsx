import { redirect } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Route } from "./+types/event-rules-page"
import { action, loader } from "./event-rules-page"

// Mock dependencies
vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/kysely-db", () => ({
  kyselyDb: {
    selectFrom: vi.fn(),
  },
}))

vi.mock("~/business/session.server", () => ({
  rulesSessionStorage: {
    getSession: vi.fn(),
    commitSession: vi.fn(),
  },
}))

vi.mock("~/lib/analytics/umami.server", () => ({
  trackServerEvent: vi.fn(),
}))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    redirect: vi.fn(),
  }
})

import { getUserContext } from "~/business/auth/auth.server"
import { kyselyDb } from "~/kysely-db"

const _mockGetUserContext = vi.mocked(getUserContext)
const mockKysely = vi.mocked(kyselyDb)
const mockRedirect = vi.mocked(redirect)

describe("event-rules-page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should redirect to dashboard if no id param", async () => {
    const mockRequest = new Request("http://localhost")
    const mockParams = {} as Route.LoaderArgs["params"]

    await loader({
      request: mockRequest,
      params: mockParams,
    } as Route.LoaderArgs)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("should redirect to dashboard if event not found", async () => {
    const mockSelectFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue(null),
        }),
      }),
    })

    mockKysely.selectFrom = mockSelectFrom

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "123" }

    await loader({
      request: mockRequest,
      params: mockParams,
    } as Route.LoaderArgs)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("should not redirect when the event exists", async () => {
    const mockSelectFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue({ id: "123" }),
        }),
      }),
    })

    mockKysely.selectFrom = mockSelectFrom

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "123" }

    await loader({
      request: mockRequest,
      params: mockParams,
    } as Route.LoaderArgs)

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockSelectFrom).toHaveBeenCalledWith("events")
    expect(mockSelectFrom().select).toHaveBeenCalledWith("id")
    expect(mockSelectFrom().select().where).toHaveBeenCalledWith(
      "id",
      "=",
      "123",
    )
  })
})

import { rulesSessionStorage } from "~/business/session.server"
import { getRulesFormQuestions } from "~/components/forms/custom/rules/rules-questions"
import { trackServerEvent } from "~/lib/analytics/umami.server"

const mockGetSession = vi.mocked(rulesSessionStorage.getSession)
const mockCommitSession = vi.mocked(rulesSessionStorage.commitSession)
const mockTrackServerEvent = vi.mocked(trackServerEvent)

const rightAnswers = () =>
  Object.fromEntries(
    Object.entries(getRulesFormQuestions("regular")).map(([id, question]) => [
      id,
      question.answers.correct.length === 1
        ? question.answers.correct[0]
        : question.answers.correct,
    ]),
  )

const postAnswers = async (answers: Record<string, unknown>) => {
  const request = new Request("http://localhost/dashboard/123/regras", {
    method: "POST",
    body: JSON.stringify(answers),
    headers: { "Content-Type": "application/json" },
  })

  const response = await action({
    request,
    params: { id: "123" },
  } as Route.ActionArgs)

  return {
    response,
    body: (await response.json()) as {
      ok: boolean
      errors?: { questionId: string; message: string }[]
    },
  }
}

describe("event-rules-page action", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockKysely.selectFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi
            .fn()
            .mockResolvedValue({ event_type: "regular" }),
        }),
      }),
    })

    mockGetSession.mockResolvedValue({ set: vi.fn() } as never)
    mockCommitSession.mockResolvedValue("__session_rules=signed")
  })

  it("turns down a post that answers nothing", async () => {
    const { body } = await postAnswers({})

    expect(body.ok).toBe(false)
    expect(body.errors).toHaveLength(
      Object.keys(getRulesFormQuestions("regular")).length,
    )
  })

  it("opens no gate for a post that answers nothing", async () => {
    await postAnswers({})

    expect(mockCommitSession).not.toHaveBeenCalled()
  })

  it("names the question it turned down, with its own message", async () => {
    const quiz = getRulesFormQuestions("regular")
    const { body } = await postAnswers({
      ...rightAnswers(),
      phone: quiz.phone.answers.incorrect[0],
    })

    expect(body.ok).toBe(false)
    expect(body.errors).toEqual([
      { questionId: "phone", message: "Você escolheu a resposta errada" },
    ])
  })

  it("lets a fully right quiz through", async () => {
    const { body } = await postAnswers(rightAnswers())

    expect(body).toEqual({ ok: true })
  })

  it("marks the quiz as passed in the session it hands back", async () => {
    const set = vi.fn()
    mockGetSession.mockResolvedValue({ set } as never)

    const { response } = await postAnswers(rightAnswers())

    expect(set).toHaveBeenCalledWith("rulesCorrect", true)
    expect(response.headers.get("Set-Cookie")).toBe("__session_rules=signed")
  })

  it("records the quiz as passed only once it is", async () => {
    await postAnswers({})
    expect(mockTrackServerEvent).not.toHaveBeenCalled()

    await postAnswers(rightAnswers())
    expect(mockTrackServerEvent).toHaveBeenCalledWith(
      "rules_quiz_passed",
      { eventId: "123" },
      "/events/123/rules",
    )
  })
})

import { MemoryRouter } from "react-router"
import userEvent from "@testing-library/user-event"
import EventRulesPage from "./event-rules-page"
import { render, screen, waitFor } from "~/test/test-utils"

const quiz = getRulesFormQuestions("regular")

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/123/regras"]}>
      <EventRulesPage
        {...({} as Route.ComponentProps)}
        loaderData={{ eventType: "regular" }}
        params={{ id: "123" }}
      />
    </MemoryRouter>,
  )

// The card that holds the quiz has a heading of its own, so the question is
// found by the id the presentation labels its control with.
const promptHeadings = () =>
  screen
    .getAllByRole("heading", { level: 2 })
    .filter((heading) => heading.id.endsWith("-prompt"))

const shownQuestion = async () => {
  await waitFor(() => expect(promptHeadings()).toHaveLength(1))

  const prompt = promptHeadings()[0].textContent ?? ""

  const entry = Object.values(quiz).find((item) => item.question === prompt)
  if (!entry) throw new Error(`no quiz entry renders as "${prompt}"`)

  return { prompt, entry }
}

const answer = async (
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) => {
  await user.click(screen.getByRole("radio", { name: text }))
  await user.click(screen.getByRole("button", { name: "Continuar" }))
}

const firstSingleAnswerQuestion = async () => {
  let shown = await shownQuestion()

  // Checkbox questions take several clicks; the screens under test here only
  // need one, so walk past any that arrives first.
  while (shown.entry.answers.correct.length > 1) {
    const user = userEvent.setup()
    for (const right of shown.entry.answers.correct) {
      await user.click(screen.getByRole("checkbox", { name: right }))
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }))
    shown = await shownQuestion()
  }

  return shown
}

describe("event-rules-page quiz", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("asks one question at a time", async () => {
    renderPage()

    await shownQuestion()

    expect(promptHeadings()).toHaveLength(1)
  })

  it("keeps the rules readable while the quiz runs", async () => {
    renderPage()

    await shownQuestion()

    expect(
      screen.getByRole("heading", { name: "Regras e filosofias" }),
    ).toBeInTheDocument()
  })

  it("refuses to move on from a wrong answer, and says why", async () => {
    const user = userEvent.setup()
    renderPage()

    const { prompt, entry } = await firstSingleAnswerQuestion()
    await answer(user, entry.answers.incorrect[0])

    expect(
      await screen.findByText("Você escolheu a resposta errada"),
    ).toBeInTheDocument()
    expect(promptHeadings()[0]).toHaveTextContent(prompt)
  })

  it("moves on once the answer is right", async () => {
    const user = userEvent.setup()
    renderPage()

    const { prompt, entry } = await firstSingleAnswerQuestion()
    await answer(user, entry.answers.correct[0])

    await waitFor(() => {
      expect(promptHeadings()[0]).not.toHaveTextContent(prompt)
    })
  })

  it("does not scroll the reader into the quiz on arrival", async () => {
    renderPage()

    await shownQuestion()

    expect(document.body).toHaveFocus()
  })

  it("takes focus once the reader has started answering", async () => {
    const user = userEvent.setup()
    renderPage()

    const { entry } = await firstSingleAnswerQuestion()
    await answer(user, entry.answers.correct[0])

    await waitFor(() => {
      expect(document.activeElement?.tagName.toLowerCase()).toBe("input")
    })
  })
})

describe("event-rules-page across a refresh", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("comes back to the question the reader was on", async () => {
    const user = userEvent.setup()
    const first = renderPage()

    const { entry } = await firstSingleAnswerQuestion()
    await answer(user, entry.answers.correct[0])

    const { prompt: reached } = await shownQuestion()
    first.unmount()

    renderPage()

    expect((await shownQuestion()).prompt).toBe(reached)
  })

  it("brings the answer already given back with it", async () => {
    const user = userEvent.setup()
    const first = renderPage()

    const { entry } = await firstSingleAnswerQuestion()
    const chosen = entry.answers.correct[0]

    // Chosen but not submitted: the answer is worth keeping from the moment it
    // is given, not from the moment it is accepted.
    await user.click(screen.getByRole("radio", { name: chosen }))
    first.unmount()

    renderPage()
    await shownQuestion()

    expect(await screen.findByRole("radio", { name: chosen })).toBeChecked()
  })
})

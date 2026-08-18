import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./verify-rules-quiz"

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

import { kyselyDb } from "~/kysely-db"

const mockKysely = vi.mocked(kyselyDb)

import { rulesSessionStorage } from "~/business/session.server"
import { getRulesFormQuestions } from "~/components/forms/custom/rules/rules-questions"
import { trackServerEvent } from "~/lib/analytics/umami.server"

const mockGetSession = vi.mocked(rulesSessionStorage.getSession)
const mockCommitSession = vi.mocked(rulesSessionStorage.commitSession)
const mockTrackServerEvent = vi.mocked(trackServerEvent)

const rightAnswers = () =>
  Object.fromEntries(
    Object.entries(getRulesFormQuestions()).map(([id, question]) => [
      id,
      question.answers.correct.length === 1
        ? question.answers.correct[0]
        : question.answers.correct,
    ]),
  )

const postAnswers = async (answers: Record<string, unknown>) => {
  const request = new Request("http://localhost/api/events/123/rules-quiz", {
    method: "POST",
    body: JSON.stringify(answers),
    headers: { "Content-Type": "application/json" },
  })

  const response = (await action({
    request,
    params: { id: "123" },
    context: {} as never,
  })) as Response

  return {
    response,
    body: (await response.json()) as {
      ok: boolean
      errors?: { questionId: string; message: string }[]
    },
  }
}

describe("the rules quiz check", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockKysely.selectFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi
            .fn()
            .mockResolvedValue({ id: "123" }),
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
      Object.keys(getRulesFormQuestions()).length,
    )
  })

  it("opens no gate for a post that answers nothing", async () => {
    await postAnswers({})

    expect(mockCommitSession).not.toHaveBeenCalled()
  })

  it("names the question it turned down, with its own message", async () => {
    const quiz = getRulesFormQuestions()
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

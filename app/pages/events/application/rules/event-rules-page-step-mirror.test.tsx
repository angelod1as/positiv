import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useNavigate, useSearchParams } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getRulesFormQuestions } from "~/components/forms/custom/rules/rules-questions"
import EventRulesPage from "./event-rules-page"

vi.mock("~/business/auth/auth.server", () => ({ getUserContext: vi.fn() }))
vi.mock("~/kysely-db", () => ({ kyselyDb: { selectFrom: vi.fn() } }))

const EVENT = "11111111-1111-4111-8111-111111111111"

let mirrored = ""

/**
 * Stands in for the mirror arriving late. The page writes the question it is
 * showing into the url, and that write can land after the quiz has moved on —
 * same push, older question.
 */
const Mirror = () => {
  const [, setSearchParams] = useSearchParams()

  return (
    <button type="button" onClick={() => setSearchParams({ q: mirrored })}>
      mirror
    </button>
  )
}

const Back = () => {
  const navigate = useNavigate()

  return (
    <button type="button" onClick={() => void navigate(-1)}>
      back
    </button>
  )
}

const onScreen = () =>
  document
    .querySelector('h2[id$="-prompt"]')
    ?.getAttribute("id")
    ?.replace(/-prompt$/, "")

const answer = async (user: ReturnType<typeof userEvent.setup>) => {
  const quiz = getRulesFormQuestions()
  const id = onScreen() as keyof typeof quiz

  for (const right of quiz[id].answers.correct) {
    await user.click(screen.getByText(right, { exact: true }))
  }

  await user.click(screen.getByRole("button", { name: "Continuar" }))

  return id as string
}

const renderQuiz = () =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/${EVENT}/regras`]}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <EventRulesPage {...({ params: { id: EVENT } } as any)} />
      <Mirror />
      <Back />
    </MemoryRouter>,
  )

describe("the rules quiz and the question mirrored in the url", () => {
  beforeEach(() => {
    sessionStorage.clear()
    mirrored = ""
  })

  it("stays put when the mirror names a question it has already left", async () => {
    const user = userEvent.setup()

    renderQuiz()

    const first = await answer(user)
    const second = onScreen()

    expect(second).not.toBe(first)

    mirrored = first
    await user.click(screen.getByRole("button", { name: "mirror" }))

    expect(onScreen()).toBe(second)
  })

  it("goes back when the reader asks the browser to", async () => {
    const user = userEvent.setup()

    renderQuiz()

    const first = await answer(user)
    const second = await answer(user)

    expect(onScreen()).not.toBe(second)

    await user.click(screen.getByRole("button", { name: "back" }))

    expect(onScreen()).toBe(second)
    expect(second).not.toBe(first)
  })
})

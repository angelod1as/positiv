import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getRulesFormQuestions } from "~/components/forms/custom/rules/rules-questions"
import EventRulesPage from "./event-rules-page"

vi.mock("~/business/auth/auth.server", () => ({ getUserContext: vi.fn() }))
vi.mock("~/kysely-db", () => ({ kyselyDb: { selectFrom: vi.fn() } }))

/**
 * Three of these tests wait up to five seconds inside themselves, which is
 * exactly vitest's default budget for a whole test — so the test died before
 * its own wait could finish, and a loaded machine failed it every time. The
 * last one waits twice.
 */
const WAITS_OUT_A_SLOW_RENDER = 20_000

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


const seedAnsweredQuiz = (openOn: string) => {
  const quiz = getRulesFormQuestions()

  const answers = Object.fromEntries(
    Object.entries(quiz).map(([id, question]) => [
      id,
      question.answers.correct.length === 1
        ? question.answers.correct[0]
        : question.answers.correct,
    ]),
  )

  sessionStorage.setItem(
    `form-runtime:rules:${EVENT}`,
    JSON.stringify({
      v: 1,
      answers,
      currentStepId: openOn,
      firstTryCorrect: {},
    }),
  )
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

    // Whichever question the shuffle deals last, answering it runs the commit.
    // Without this the quiz stays put on a failed save, and a test that only
    // wanted the next question fails once every fourteen runs.
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ json: () => Promise.resolve({ ok: true }) }),
      ),
    )
  })

  it("stays put when the mirror names a question it has already left", async () => {
    const user = userEvent.setup()

    renderQuiz()

    const first = await answer(user)
    const second = onScreen()

    expect(second).not.toBe(first)

    mirrored = first
    await user.click(screen.getByRole("button", { name: "mirror" }))

    // Nothing should happen, so this waits for the chance to happen before
    // reading: a mirror that moves the quiz does so a tick after the click.
    await new Promise((settle) => setTimeout(settle, 50))

    expect(onScreen()).toBe(second)
  })

  it("goes back when the reader asks the browser to", async () => {
    const user = userEvent.setup()

    renderQuiz()

    const first = await answer(user)
    const second = await answer(user)

    expect(onScreen()).not.toBe(second)

    await user.click(screen.getByRole("button", { name: "back" }))

    await waitFor(() => expect(onScreen()).toBe(second), { timeout: 5000 })
    expect(second).not.toBe(first)
  }, WAITS_OUT_A_SLOW_RENDER)

  it("opens on the question a link names", async () => {
    const user = userEvent.setup()

    // A link into the middle of the quiz is the reader asking for that
    // question, even though following it is a push like any other.
    const ids = Object.keys(getRulesFormQuestions())
    const stored = ids[0]
    const asked = ids[1]

    seedAnsweredQuiz(stored)

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <Link to={`/dashboard/${EVENT}/regras?q=${asked}`}>deep</Link>
            }
          />
          <Route
            path="/dashboard/:id/regras"
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            element={<EventRulesPage {...({ params: { id: EVENT } } as any)} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("link", { name: "deep" }))

    await waitFor(() => expect(onScreen()).toBe(asked), { timeout: 5000 })
  }, WAITS_OUT_A_SLOW_RENDER)

  it("does not snap back to where it opened after the reader goes back", async () => {
    const user = userEvent.setup()

    // Reloading pins the url on the question showing at the time. Going back
    // from there is the reader moving, and answering on from there must not be
    // undone by the question the reload happened to open on.
    const ids = Object.keys(getRulesFormQuestions())
    const earlier = ids[0]
    const reloadedOn = ids[1]

    seedAnsweredQuiz(reloadedOn)

    render(
      <MemoryRouter
        initialEntries={[
          `/dashboard/${EVENT}/regras?q=${earlier}`,
          `/dashboard/${EVENT}/regras?q=${reloadedOn}`,
        ]}
        initialIndex={1}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <EventRulesPage {...({ params: { id: EVENT } } as any)} />
        <Back />
      </MemoryRouter>,
    )

    expect(onScreen()).toBe(reloadedOn)

    await user.click(screen.getByRole("button", { name: "back" }))
    await waitFor(() => expect(onScreen()).toBe(earlier), { timeout: 5000 })

    // Answering on from there works. Which question comes next is whatever the
    // shuffle decided, and it may well be the one the reload pinned — so the
    // regression this test guards is the assertion above, that going back lands
    // where the reader asked to be instead of snapping to the pinned question.
    const quiz = getRulesFormQuestions()
    for (const right of quiz[earlier as keyof typeof quiz].answers.correct) {
      await user.click(screen.getByText(right, { exact: true }))
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    // Generous on purpose: answering runs an async advance through the runtime,
    // and this file renders the whole rules text on every step, which is slow
    // enough under a loaded machine to outlast the default second.
    await waitFor(() => expect(onScreen()).not.toBe(earlier), { timeout: 5000 })
  }, WAITS_OUT_A_SLOW_RENDER)
})

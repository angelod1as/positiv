import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readRulesDeal } from "~/components/forms/custom/rules/rules-order"
import {
  runtimeStorageKey,
  writeRuntimeState,
} from "~/components/forms/runtime/persistence"
import { getRulesFormQuestions } from "~/components/forms/custom/rules/rules-questions"
import EventRulesPage from "./event-rules-page"

vi.mock("~/business/auth/auth.server", () => ({ getUserContext: vi.fn() }))
vi.mock("~/kysely-db", () => ({ kyselyDb: { selectFrom: vi.fn() } }))

const EVENT = "11111111-1111-4111-8111-111111111111"

const ids = () => Object.keys(getRulesFormQuestions())

const answersOf = (id: string) => {
  const { answers } = getRulesFormQuestions()[
    id as keyof ReturnType<typeof getRulesFormQuestions>
  ]

  return [...answers.correct, ...answers.incorrect]
}

const dealtQuestions = () => [...ids()].reverse()

const seedDeal = (deal: {
  questions: string[]
  options?: Record<string, string[]>
}) =>
  sessionStorage.setItem(
    `rules-order:${EVENT}`,
    JSON.stringify({ options: {}, ...deal }),
  )

// A question with one right answer draws radios, one with several draws
// checkboxes, and only the radio carries the answer as a value — so both are
// read off the text beside the control. It is the label's last span either way:
// the checkbox wraps its own input in one.
const onScreenAnswers = () =>
  [
    ...(document
      .querySelector('form [role="radiogroup"], form [role="group"]')
      ?.querySelectorAll("label > span:last-child") ?? []),
  ].map((span) => span.textContent ?? "")

const onScreen = () =>
  document
    .querySelector('h2[id$="-prompt"]')
    ?.getAttribute("id")
    ?.replace(/-prompt$/, "")

const renderQuiz = () =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/${EVENT}/regras`]}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <EventRulesPage
        {...({
          params: { id: EVENT },
          loaderData: { isVeteran: false },
        } as any)}
      />
    </MemoryRouter>,
  )

/**
 * The quiz is dealt at random, so a run that reshuffles on every refresh is
 * caught by pinning the order rather than by watching a number wander: the
 * question the reader is on keeps its id across a refresh, and only its place
 * in the order — which is what the progress count reads — moves.
 */
describe("the order the rules quiz was dealt", () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ ok: true }) })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("opens on the first question of the order the run was dealt", async () => {
    const dealt = dealtQuestions()
    seedDeal({ questions: dealt })

    renderQuiz()

    await waitFor(() => expect(onScreen()).toBe(dealt[0]))
    expect(screen.getByText(`1/${dealt.length}`)).toBeInTheDocument()
  })

  it("counts the question by its place in that order", async () => {
    const dealt = dealtQuestions()
    const openOn = dealt[6]

    seedDeal({ questions: dealt })
    writeRuntimeState(runtimeStorageKey("rules", EVENT), {
      answers: { [openOn]: "seja lá o que for" },
      currentStepId: openOn,
      firstTryCorrect: {},
    })

    renderQuiz()

    await waitFor(() => expect(onScreen()).toBe(openOn))
    expect(screen.getByText(`7/${dealt.length}`)).toBeInTheDocument()
  })

  it("writes down the order it dealt, so a refresh finds it", async () => {
    renderQuiz()

    await waitFor(() => expect(onScreen()).toBeDefined())

    const written = readRulesDeal(EVENT)

    expect(written).not.toBeNull()
    expect([...(written?.questions ?? [])].sort()).toEqual(ids().sort())
    expect(written?.questions[0]).toBe(onScreen())
    expect(written?.options[onScreen() as string]).toEqual(onScreenAnswers())
  })

  // The server has no session storage, so it deals an order of its own. That
  // would be a hydration mismatch if the order reached the markup — it does
  // not: the runtime draws a skeleton until it has restored, which it can only
  // do after mount, on the server and on the first client render alike.
  it("keeps the dealt order out of the markup it hydrates", () => {
    seedDeal({ questions: dealtQuestions() })

    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={[`/dashboard/${EVENT}/regras`]}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <EventRulesPage
        {...({
          params: { id: EVENT },
          loaderData: { isVeteran: false },
        } as any)}
      />
      </MemoryRouter>,
    )

    expect(markup).not.toContain("-prompt")
    expect(markup).toContain('aria-busy="true"')
  })

  // A refresh that keeps the question but swaps its alternatives around is the
  // same rearrangement, one level down.
  it("lays the answers out the way the run was dealt them", async () => {
    const dealt = dealtQuestions()
    const laid = [...answersOf(dealt[0])].sort()

    seedDeal({ questions: dealt, options: { [dealt[0]]: laid } })

    renderQuiz()

    await waitFor(() => expect(onScreen()).toBe(dealt[0]))
    expect(onScreenAnswers()).toEqual(laid)
  })

  it("forgets the order when the run is finished", async () => {
    const user = userEvent.setup()
    const quiz = getRulesFormQuestions()

    renderQuiz()
    await waitFor(() => expect(onScreen()).toBeDefined())

    for (let asked = 0; asked < ids().length; asked++) {
      const id = onScreen() as keyof typeof quiz

      for (const right of quiz[id].answers.correct) {
        await user.click(screen.getByText(right, { exact: true }))
      }

      await user.click(screen.getByRole("button", { name: "Continuar" }))
    }

    await waitFor(() => expect(readRulesDeal(EVENT)).toBeNull())
  })
})

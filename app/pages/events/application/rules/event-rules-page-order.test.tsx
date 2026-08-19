import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { readRulesOrder } from "~/components/forms/custom/rules/rules-order"
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

const onScreen = () =>
  document
    .querySelector('h2[id$="-prompt"]')
    ?.getAttribute("id")
    ?.replace(/-prompt$/, "")

const renderQuiz = () =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/${EVENT}/regras`]}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <EventRulesPage {...({ params: { id: EVENT } } as any)} />
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

  it("opens on the first question of the order the run was dealt", async () => {
    const dealt = [...ids()].reverse()
    sessionStorage.setItem(`rules-order:${EVENT}`, JSON.stringify(dealt))

    renderQuiz()

    await waitFor(() => expect(onScreen()).toBe(dealt[0]))
    expect(screen.getByText(`1/${dealt.length}`)).toBeInTheDocument()
  })

  it("counts the question by its place in that order", async () => {
    const dealt = [...ids()].reverse()
    const openOn = dealt[6]

    sessionStorage.setItem(`rules-order:${EVENT}`, JSON.stringify(dealt))
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

    const written = readRulesOrder(EVENT)

    expect(written).not.toBeNull()
    expect([...(written ?? [])].sort()).toEqual(ids().sort())
    expect(written?.[0]).toBe(onScreen())
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

    await waitFor(() => expect(readRulesOrder(EVENT)).toBeNull())
  })
})

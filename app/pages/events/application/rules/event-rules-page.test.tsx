import { redirect } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Route } from "./+types/event-rules-page"
import { loader } from "./event-rules-page"

// Mock dependencies
vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/kysely-db", () => ({
  kyselyDb: {
    selectFrom: vi.fn(),
  },
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

import { MemoryRouter, useLocation } from "react-router"
import userEvent from "@testing-library/user-event"
import { buildRulesQuestions } from "~/components/forms/custom/rules/build-rules-questions"
import { getRulesFormQuestions } from "~/components/forms/custom/rules/rules-questions"
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

const Location = () => {
  const location = useLocation()

  return <output data-testid="location">{location.search}</output>
}

const renderPageAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <EventRulesPage
        {...({} as Route.ComponentProps)}
        loaderData={{ eventType: "regular" }}
        params={{ id: "123" }}
      />
      <Location />
    </MemoryRouter>,
  )

const currentSearch = () => screen.getByTestId("location").textContent

describe("event-rules-page in the url", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("names the question it is showing", async () => {
    renderPageAt("/dashboard/123/regras")

    const { prompt } = await shownQuestion()
    const id = promptHeadings()[0].id.replace(/-prompt$/, "")

    await waitFor(() => expect(currentSearch()).toBe(`?q=${id}`))
    expect(prompt).not.toBe("")
  })

  it("follows the reader forward", async () => {
    const user = userEvent.setup()
    renderPageAt("/dashboard/123/regras")

    const { entry } = await firstSingleAnswerQuestion()
    const before = currentSearch()

    await answer(user, entry.answers.correct[0])

    await waitFor(() => expect(currentSearch()).not.toBe(before))
  })

  it("refuses a question the reader has not reached", async () => {
    // Pinning the shuffle is what makes "the last question" a fixed target:
    // asking for a random id could name the one the quiz opens on anyway.
    vi.spyOn(Math, "random").mockReturnValue(0)

    const order = buildRulesQuestions("regular")
    const first = order[0]
    const last = order[order.length - 1]

    renderPageAt(`/dashboard/123/regras?q=${last.id}`)

    await waitFor(() => expect(promptHeadings()[0].id).toBe(`${first.id}-prompt`))

    vi.mocked(Math.random).mockRestore()
  })
})

import { redirect } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Route } from "./+types/event-rules-page"
import { loader } from "./event-rules-page"

// Mock dependencies
vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/event/find-visible-event.server", () => ({
  findVisibleEvent: vi.fn(),
}))

vi.mock("~/business/participant/is-veteran.server", () => ({
  isVeteran: vi.fn(),
}))

const { ENV } = vi.hoisted(() => ({
  ENV: { NODE_ENV: "development" } as Record<string, unknown>,
}))
vi.mock("varlock/env", () => ({ ENV }))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    redirect: vi.fn(),
  }
})

import { getUserContext } from "~/business/auth/auth.server"
import { findVisibleEvent } from "~/business/event/find-visible-event.server"
import { isVeteran } from "~/business/participant/is-veteran.server"
import type { EventStatus } from "~types/database/entities.types"

const mockGetUserContext = vi.mocked(getUserContext)
const mockFindVisibleEvent = vi.mocked(findVisibleEvent)
const mockIsVeteran = vi.mocked(isVeteran)
const mockRedirect = vi.mocked(redirect)

const eventLookupReturns = (
  event: { id: string; event_status: EventStatus } | undefined,
) => {
  mockFindVisibleEvent.mockResolvedValue(event)
}

const eventExists = () =>
  eventLookupReturns({ id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c", event_status: "Registration Open" })

const signedInAs = (profileId: string | null) => {
  mockGetUserContext.mockResolvedValue({
    currentProfile: profileId ? { id: profileId } : null,
  } as never)
}

describe("event-rules-page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signedInAs("profile-1")
    mockIsVeteran.mockResolvedValue(false)
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
    eventLookupReturns(undefined)

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" }

    await loader({
      request: mockRequest,
      params: mockParams,
    } as Route.LoaderArgs)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("should not redirect when the event is visible", async () => {
    eventExists()

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" }

    await loader({
      request: mockRequest,
      params: mockParams,
    } as Route.LoaderArgs)

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockFindVisibleEvent).toHaveBeenCalledWith("3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c")
  })

  it("asks the database itself whether the person has been before", async () => {
    eventExists()
    mockIsVeteran.mockResolvedValue(true)

    const data = await loader({
      request: new Request("http://localhost"),
      params: { id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
    } as Route.LoaderArgs)

    expect(mockIsVeteran).toHaveBeenCalledWith("profile-1", "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c")
    expect(data).toEqual({
      eventStatus: "Registration Open",
      isVeteran: true,
      profileId: "profile-1",
    })
  })

  it("treats a request without a profile as someone who has never been", async () => {
    eventExists()
    signedInAs(null)

    const data = await loader({
      request: new Request("http://localhost"),
      params: { id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
    } as Route.LoaderArgs)

    expect(mockIsVeteran).not.toHaveBeenCalled()
    expect(data).toEqual({
      eventStatus: "Registration Open",
      isVeteran: false,
      profileId: "",
    })
  })
})

import * as reactRouter from "react-router"
import { MemoryRouter, useLocation, useSearchParams } from "react-router"
import userEvent from "@testing-library/user-event"
import { buildCorrectRulesAnswers } from "~/components/forms/custom/rules/build-correct-rules-answers"
import { buildRulesQuestions } from "~/components/forms/custom/rules/build-rules-questions"
import { getRulesFormQuestions } from "~/components/forms/custom/rules/rules-questions"
import EventRulesPage from "./event-rules-page"
import { render, screen, waitFor } from "~/test/test-utils"
import { rulesQuizCopy, rulesStatusNoticeCopy } from "~/copy/events"

const quiz = getRulesFormQuestions()

const renderPage = ({
  isVeteran = false,
  profileId = "profile-1",
  eventStatus = "Registration Open",
}: {
  isVeteran?: boolean
  profileId?: string
  eventStatus?: EventStatus
} = {}) =>
  render(
    <MemoryRouter initialEntries={["/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras"]}>
      <EventRulesPage
        {...({} as Route.ComponentProps)}
        params={{ id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" }}
        loaderData={{ eventStatus, isVeteran, profileId }}
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

describe("event-rules-page for an event that no longer takes applications", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("shows the cancelled notice and no quiz for a cancelled event", () => {
    renderPage({ eventStatus: "Cancelled" })

    expect(
      screen.getByText(rulesStatusNoticeCopy.Cancelled),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Continuar" }),
    ).not.toBeInTheDocument()
  })

  it("shows the completed notice and no quiz for a completed event", () => {
    renderPage({ eventStatus: "Completed" })

    expect(
      screen.getByText(rulesStatusNoticeCopy.Completed),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Continuar" }),
    ).not.toBeInTheDocument()
  })

  it("runs the quiz for an open event", async () => {
    renderPage({ eventStatus: "Registration Open" })

    await shownQuestion()

    expect(
      screen.queryByText(rulesStatusNoticeCopy.Cancelled),
    ).not.toBeInTheDocument()
  })
})

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

const actualUseSearchParams = useSearchParams

const Location = () => {
  const location = useLocation()

  return <output data-testid="location">{location.search}</output>
}

const renderPageAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <EventRulesPage
        {...({} as Route.ComponentProps)}
        params={{ id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" }}
        loaderData={{ eventStatus: "Registration Open", isVeteran: false, profileId: "profile-1" }}
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
    renderPageAt("/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras")

    const { prompt } = await shownQuestion()
    const id = promptHeadings()[0].id.replace(/-prompt$/, "")

    await waitFor(() => expect(currentSearch()).toBe(`?q=${id}`))
    expect(prompt).not.toBe("")
  })

  it("follows the reader forward", async () => {
    const user = userEvent.setup()
    renderPageAt("/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras")

    const { entry } = await firstSingleAnswerQuestion()
    const before = currentSearch()

    await answer(user, entry.answers.correct[0])

    await waitFor(() => expect(currentSearch()).not.toBe(before))
  })

  it("refuses a question the reader has not reached", async () => {
    // Pinning the shuffle is what makes "the last question" a fixed target:
    // asking for a random id could name the one the quiz opens on anyway.
    vi.spyOn(Math, "random").mockReturnValue(0)

    const order = buildRulesQuestions()
    const first = order[0]
    const last = order[order.length - 1]

    renderPageAt(`/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras?q=${last.id}`)

    await waitFor(() => expect(promptHeadings()[0].id).toBe(`${first.id}-prompt`))

    vi.mocked(Math.random).mockRestore()
  })
})

describe("event-rules-page as a target for a bare POST", () => {
  it("exports no action, which is what makes the route refuse one", async () => {
    const page = await import("./event-rules-page")

    // The quiz used to be opened by any POST to this route, because its action
    // set rulesCorrect without reading the answers. The check lives in
    // /api/events/:id/rules-quiz now, and this route answering 405 depends on
    // there being no handler here at all — an easy thing to undo by accident.
    expect("action" in page).toBe(false)
  })
})

describe("event-rules-page scrolling", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("does not send the reader back to the top of the rules on every answer", async () => {
    const user = userEvent.setup()
    const options: unknown[] = []

    const useSearchParamsSpy = vi
      .spyOn(reactRouter, "useSearchParams")
      .mockImplementation(() => {
        const [params, setParams] = actualUseSearchParams()

        return [
          params,
          ((next: never, opts: never) => {
            options.push(opts)
            setParams(next, opts)
          }) as never,
        ]
      })

    try {
      renderPage()

      const { entry } = await firstSingleAnswerQuestion()
      await answer(user, entry.answers.correct[0])

      await waitFor(() => expect(options.length).toBeGreaterThan(0))

      // The quiz sits under the whole rules text, and every step change is a
      // navigation. Without this the reader is thrown back to the top of the
      // rules each time they answer.
      for (const option of options) {
        expect(option).toMatchObject({ preventScrollReset: true })
      }
    } finally {
      useSearchParamsSpy.mockRestore()
    }
  })
})

const Pathname = () => {
  const location = useLocation()

  return <output data-testid="pathname">{location.pathname}</output>
}

const renderPageWithPathname = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras"]}>
      <EventRulesPage
        {...({} as Route.ComponentProps)}
        params={{ id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" }}
        loaderData={{ eventStatus: "Registration Open", isVeteran: false, profileId: "profile-1" }}
      />
      <Pathname />
    </MemoryRouter>,
  )

const currentPathname = () => screen.getByTestId("pathname").textContent

describe("event-rules-page skip in development", () => {
  const skipLabel = /Pular quiz \(dev\)/i

  beforeEach(() => {
    sessionStorage.clear()
    ENV.NODE_ENV = "development"
    vi.restoreAllMocks()
  })

  it("is not offered in production", async () => {
    ENV.NODE_ENV = "production"
    renderPage()

    await shownQuestion()

    expect(screen.queryByRole("button", { name: skipLabel })).toBeNull()
  })

  it("is offered in development", async () => {
    renderPage()

    await shownQuestion()

    expect(
      await screen.findByRole("button", { name: skipLabel }),
    ).toBeInTheDocument()
  })

  it("sends the right answers to the same check everyone passes", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ ok: true }))

    renderPageWithPathname()
    await shownQuestion()

    await user.click(await screen.findByRole("button", { name: skipLabel }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/events/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/rules-quiz")
    expect(JSON.parse(String(init?.body))).toEqual(buildCorrectRulesAnswers())

    await waitFor(() =>
      expect(currentPathname()).toBe("/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/dados"),
    )
  })

  it("stays on the quiz when the check refuses the run", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ok: false, errors: [] }),
    )

    renderPageWithPathname()
    await shownQuestion()

    await user.click(await screen.findByRole("button", { name: skipLabel }))

    await waitFor(() => expect(currentPathname()).toBe("/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras"))
  })
})

describe("event-rules-page for someone who has been before", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("opens on the question that asks how they are", async () => {
    renderPage({ isVeteran: true })

    const { prompt } = await shownQuestion()

    expect(prompt).toBe(quiz.trigger.question)
  })

  it("promises three screens, not fourteen", async () => {
    renderPage({ isVeteran: true })

    await shownQuestion()

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "Etapa 1 de 3",
    )
  })

  it("promises the whole quiz to someone who has never been", async () => {
    renderPage({ isVeteran: false })

    await shownQuestion()

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      `Etapa 1 de ${Object.keys(quiz).length}`,
    )
  })
})

describe("event-rules-page for two people in one browser session", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("does not hand one person's run to the next", async () => {
    const user = userEvent.setup()

    const first = renderPage({ isVeteran: false, profileId: "profile-1" })
    const started = await firstSingleAnswerQuestion()
    await answer(user, started.entry.answers.correct[0])
    await waitFor(async () => {
      expect((await shownQuestion()).prompt).not.toBe(started.prompt)
    })
    first.unmount()

    // Same tab, same event, different person: signing in as someone else must
    // not resume a run that was not theirs — the quiz they are owed depends on
    // whether they have been to a Positiv, and the answers are not theirs
    // either.
    renderPage({ isVeteran: true, profileId: "profile-2" })

    expect((await shownQuestion()).prompt).toBe(quiz.trigger.question)
  })

  it("does not keep the first person's quiz when the loader revalidates in place", async () => {
    const user = userEvent.setup()

    const { rerender } = renderPage({
      isVeteran: false,
      profileId: "profile-1",
    })
    const started = await firstSingleAnswerQuestion()
    await answer(user, started.entry.answers.correct[0])
    await waitFor(async () => {
      expect((await shownQuestion()).prompt).not.toBe(started.prompt)
    })

    // The route can stay mounted while the loader comes back with a different
    // person — no remount to reset anything, so the page has to notice on its
    // own that the run it is showing is not theirs.
    rerender(
      <MemoryRouter initialEntries={["/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras"]}>
        <EventRulesPage
          {...({} as Route.ComponentProps)}
          params={{ id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" }}
          loaderData={{ eventStatus: "Registration Open", isVeteran: true, profileId: "profile-2" }}
        />
      </MemoryRouter>,
    )

    expect((await shownQuestion()).prompt).toBe(quiz.trigger.question)
  })
})

// A checkbox question keeps whatever was marked on it, so a wrong answer left
// behind would sink the corrected attempt too. Clicking a radio replaces the
// selection on its own, which is why unmarking one is never asked for.
const setOption = async (
  user: ReturnType<typeof userEvent.setup>,
  text: string,
  wanted: boolean,
) => {
  const control = (screen.queryByRole("radio", { name: text }) ??
    screen.getByRole("checkbox", { name: text })) as HTMLInputElement

  if (control.checked === wanted) return

  await user.click(control)
}

const answerCorrectly = async (user: ReturnType<typeof userEvent.setup>) => {
  const { entry, prompt } = await shownQuestion()

  for (const right of entry.answers.correct) await setOption(user, right, true)
  for (const wrong of entry.answers.incorrect) {
    await setOption(user, wrong, false)
  }
  await user.click(screen.getByRole("button", { name: "Continuar" }))

  await waitFor(async () => {
    expect((await shownQuestion()).prompt).not.toBe(prompt)
  })
}

const answerWrongly = async (user: ReturnType<typeof userEvent.setup>) => {
  const { entry, prompt } = await shownQuestion()

  await setOption(user, entry.answers.incorrect[0], true)
  await user.click(screen.getByRole("button", { name: "Continuar" }))

  // A wrong answer never advances, so the message arriving is what says the
  // attempt landed — the rules above the quiz carry alerts of their own, so it
  // is found by its own words.
  await waitFor(() => {
    expect(
      screen.getByText((text) =>
        Object.values(rulesQuizCopy.answerErrors).includes(
          text as (typeof rulesQuizCopy.answerErrors)[keyof typeof rulesQuizCopy.answerErrors],
        ),
      ),
    ).toBeInTheDocument()
  })
  expect((await shownQuestion()).prompt).toBe(prompt)
}

describe("what the quiz tells a veteran it is about to ask", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("offers the short run as a wager", async () => {
    renderPage({ isVeteran: true, profileId: "profile-1" })

    await shownQuestion()

    expect(screen.getByText(rulesQuizCopy.veteranWager)).toBeInTheDocument()
  })

  it("says nothing of the sort to someone who has never been", async () => {
    renderPage({ isVeteran: false, profileId: "profile-1" })

    await shownQuestion()

    expect(screen.queryByText(rulesQuizCopy.veteranWager)).not.toBeInTheDocument()
    expect(
      screen.queryByText(rulesQuizCopy.veteranLostWager),
    ).not.toBeInTheDocument()
  })

  it("does not greet the next person with the line the last one earned", async () => {
    const user = userEvent.setup()

    const { rerender } = renderPage({ isVeteran: true, profileId: "profile-1" })

    await answerCorrectly(user)
    await answerWrongly(user)
    await answerCorrectly(user)
    await answerWrongly(user)

    await waitFor(() => {
      expect(
        screen.getByText(rulesQuizCopy.veteranLostWager),
      ).toBeInTheDocument()
    })

    rerender(
      <MemoryRouter initialEntries={["/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras"]}>
        <EventRulesPage
          {...({} as Route.ComponentProps)}
          params={{ id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" }}
          loaderData={{ eventStatus: "Registration Open", isVeteran: true, profileId: "profile-2" }}
        />
      </MemoryRouter>,
    )

    // A run of their own, three screens long: the line the previous person
    // earned belongs to a quiz that is over.
    expect(screen.getByText(rulesQuizCopy.veteranWager)).toBeInTheDocument()
    expect(
      screen.queryByText(rulesQuizCopy.veteranLostWager),
    ).not.toBeInTheDocument()
  })

  it("changes its tune once both probes have gone wrong", async () => {
    const user = userEvent.setup()
    renderPage({ isVeteran: true, profileId: "profile-1" })

    await answerCorrectly(user)
    await answerWrongly(user)
    await answerCorrectly(user)
    await answerWrongly(user)

    await waitFor(() => {
      expect(
        screen.getByText(rulesQuizCopy.veteranLostWager),
      ).toBeInTheDocument()
    })
    expect(screen.queryByText(rulesQuizCopy.veteranWager)).not.toBeInTheDocument()
  })
})

describe("event-rules-page analytics", () => {
  const skipLabel = /Pular quiz \(dev\)/i
  const umamiTrack = vi.fn()

  beforeEach(() => {
    sessionStorage.clear()
    ENV.NODE_ENV = "development"
    vi.restoreAllMocks()
    umamiTrack.mockClear()
    window.umami = { track: umamiTrack }
  })

  afterEach(() => {
    delete window.umami
  })

  it("reports the quiz passed once the check accepts the answers", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ok: true }))

    renderPageWithPathname()
    await shownQuestion()
    await user.click(await screen.findByRole("button", { name: skipLabel }))

    await waitFor(() =>
      expect(umamiTrack).toHaveBeenCalledWith("rules_quiz_passed", {
        eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c",
      }),
    )
  })

  const EVENT_ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"
  const sent = (name: string) =>
    umamiTrack.mock.calls.filter(([event]) => event === name)
  const idOf = (entry: (typeof quiz)[keyof typeof quiz]) =>
    Object.keys(quiz).find((id) => quiz[id as keyof typeof quiz] === entry)

  it("reports nothing about the quiz before anything is answered", async () => {
    renderPageWithPathname()
    await shownQuestion()

    expect(umamiTrack).not.toHaveBeenCalled()
  })

  it("reports the quiz started once the first answer goes through", async () => {
    const user = userEvent.setup()
    renderPageWithPathname()

    const { entry } = await firstSingleAnswerQuestion()
    await answer(user, entry.answers.correct[0])
    await shownQuestion()

    await waitFor(() =>
      expect(sent("rules_quiz_started")).toEqual([
        ["rules_quiz_started", { eventId: EVENT_ID }],
      ]),
    )
  })

  it("reports the quiz started, then failed, on a wrong first answer", async () => {
    const user = userEvent.setup()
    renderPageWithPathname()

    const { entry } = await firstSingleAnswerQuestion()
    await answer(user, entry.answers.incorrect[0])

    await waitFor(() =>
      expect(sent("rules_quiz_failed")).toEqual([
        ["rules_quiz_failed", { eventId: EVENT_ID, question: idOf(entry) }],
      ]),
    )
    expect(sent("rules_quiz_started")).toHaveLength(1)
  })

  it("reports the quiz failed once per run", async () => {
    const user = userEvent.setup()
    renderPageWithPathname()

    const first = await firstSingleAnswerQuestion()
    await answer(user, first.entry.answers.incorrect[0])
    await answer(user, first.entry.answers.correct[0])

    const second = await firstSingleAnswerQuestion()
    expect(second.prompt).not.toBe(first.prompt)
    await answer(user, second.entry.answers.incorrect[0])

    await waitFor(() => expect(sent("rules_quiz_failed")).toHaveLength(1))
  })

  it("reports again for another event the page stays mounted for", async () => {
    const user = userEvent.setup()
    const OTHER_EVENT_ID = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
    const { rerender } = renderPageWithPathname()

    const first = await firstSingleAnswerQuestion()
    await answer(user, first.entry.answers.incorrect[0])
    await waitFor(() => expect(sent("rules_quiz_failed")).toHaveLength(1))

    rerender(
      <MemoryRouter initialEntries={[`/dashboard/${OTHER_EVENT_ID}/regras`]}>
        <EventRulesPage
          {...({} as Route.ComponentProps)}
          params={{ id: OTHER_EVENT_ID }}
          loaderData={{ eventStatus: "Registration Open", isVeteran: false, profileId: "profile-1" }}
        />
      </MemoryRouter>,
    )

    const second = await firstSingleAnswerQuestion()
    await answer(user, second.entry.answers.incorrect[0])

    await waitFor(() =>
      expect(sent("rules_quiz_failed")).toEqual([
        ["rules_quiz_failed", { eventId: EVENT_ID, question: idOf(first.entry) }],
        [
          "rules_quiz_failed",
          { eventId: OTHER_EVENT_ID, question: idOf(second.entry) },
        ],
      ]),
    )
    expect(sent("rules_quiz_started")).toEqual([
      ["rules_quiz_started", { eventId: EVENT_ID }],
      ["rules_quiz_started", { eventId: OTHER_EVENT_ID }],
    ])
  })

  it("reports nothing when the check refuses the answers", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ok: false, errors: [] }),
    )

    renderPageWithPathname()
    await shownQuestion()
    await user.click(await screen.findByRole("button", { name: skipLabel }))

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(umamiTrack).not.toHaveBeenCalled()
  })
})

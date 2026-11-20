import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/profile/likert-answers.server", () => ({
  canSeeLikert: vi.fn(),
}))

vi.mock("~/business/profile/likert-submissions.server", () => ({
  getLikertSubmission: vi.fn(),
}))

import { getUserContext } from "~/business/auth/auth.server"
import { canSeeLikert } from "~/business/profile/likert-answers.server"
import { getLikertSubmission } from "~/business/profile/likert-submissions.server"
import LikertSubmissionPage, { loader } from "./likert-submission-page"

type PageProps = Parameters<typeof LikertSubmissionPage>[0]
type LoaderArgs = Parameters<typeof loader>[0]

const SUBMISSION_ID = "6f1c2b8e-1d3a-4c5b-9e7f-0a1b2c3d4e5f"
const currentProfile = { id: "profile-1", permissions: [] }

const stored = {
  id: SUBMISSION_ID,
  profileId: "profile-1",
  submittedAt: new Date("2026-11-18T17:00:00.000Z"),
  beenTo: [],
  nonMonogamySince: null,
  answers: [
    {
      statementKey: "ciume",
      statementText: "Sinto ciúme e tudo bem.",
      answer: 2,
      comment: "às vezes",
    },
    {
      statementKey: "consentimento",
      statementText: "Pergunto antes de tocar.",
      answer: 5,
      comment: null,
    },
  ],
}

const runLoader = (submissionId: string = SUBMISSION_ID) =>
  loader({
    request: new Request(`http://localhost/conta/escala/${submissionId}`),
    params: { submissionId },
  } as unknown as LoaderArgs)

describe("LikertSubmissionPage loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserContext).mockResolvedValue({
      currentProfile,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>)
    vi.mocked(canSeeLikert).mockResolvedValue(true)
  })

  it("hands the page the submission as it was saved", async () => {
    vi.mocked(getLikertSubmission).mockResolvedValue(stored)

    expect(await runLoader()).toEqual({
      submittedAt: "2026-11-18T17:00:00.000Z",
      answers: [
        { statementText: "Sinto ciúme e tudo bem.", answer: 2, comment: "às vezes" },
        { statementText: "Pergunto antes de tocar.", answer: 5, comment: null },
      ],
    })
    expect(getLikertSubmission).toHaveBeenCalledWith(
      SUBMISSION_ID,
      currentProfile,
    )
  })

  it("answers an id that is not a uuid with 404, before any query", async () => {
    const thrown = await runLoader("nao-e-um-id").catch((error: unknown) => error)

    expect((thrown as Response).status).toBe(404)
    expect(getLikertSubmission).not.toHaveBeenCalled()
  })

  it("sends a submission that cannot be read back to the history", async () => {
    vi.mocked(getLikertSubmission).mockResolvedValue(null)

    const result = await runLoader()

    expect((result as Response).headers.get("Location")).toBe("/conta/escala")
  })

  it("sends someone else's submission back to the history, even for an admin", async () => {
    vi.mocked(getLikertSubmission).mockResolvedValue({
      ...stored,
      profileId: "someone-else",
    })

    const result = await runLoader()

    expect((result as Response).headers.get("Location")).toBe("/conta/escala")
  })

  it("sends someone who may not see the scale back to the account", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(false)

    const result = await runLoader()

    expect((result as Response).headers.get("Location")).toBe("/conta")
    expect(getLikertSubmission).not.toHaveBeenCalled()
  })
})

describe("LikertSubmissionPage", () => {
  it("shows each statement as it was asked, with the answer and the comment", () => {
    render(
      <MemoryRouter>
        <LikertSubmissionPage
          {...({
            loaderData: {
              submittedAt: "2026-11-18T17:00:00.000Z",
              answers: [
                {
                  statementText: "Sinto ciúme e tudo bem.",
                  answer: 2,
                  comment: "às vezes",
                },
                {
                  statementText: "Pergunto antes de tocar.",
                  answer: 5,
                  comment: null,
                },
              ],
            },
          } as PageProps)}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("heading", { name: /18 de novembro de 2026/ }),
    ).toBeVisible()
    expect(screen.getByText("Sinto ciúme e tudo bem.")).toBeVisible()
    expect(screen.getByText("Discordo")).toBeVisible()
    expect(screen.getByText("às vezes")).toBeVisible()
    expect(screen.getByText("Pergunto antes de tocar.")).toBeVisible()
    expect(screen.getByText("Concordo totalmente")).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Voltar para o histórico" }),
    ).toHaveAttribute("href", "/conta/escala")
  })
})

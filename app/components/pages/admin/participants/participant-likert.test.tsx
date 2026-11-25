import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import type { LikertSubmissionSummary } from "~/business/profile/participant-likert.server"
import { render, screen, within } from "~/test/test-utils"
import { ParticipantLikert } from "./participant-likert"

const profileId = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
const eventId = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"
const latestId = "aaaaaaaa-1111-4111-8111-111111111111"
const olderId = "bbbbbbbb-2222-4222-8222-222222222222"

const two: LikertSubmissionSummary[] = [
  { id: latestId, submittedAt: new Date("2026-11-10T15:00:00Z") },
  { id: olderId, submittedAt: new Date("2026-10-01T15:00:00Z") },
]

const renderLikert = (
  likert: LikertSubmissionSummary[] | null,
  event: string | null = null,
) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <ParticipantLikert
            likert={likert}
            profileId={profileId}
            eventId={event}
          />
        ),
      },
    ],
    { initialEntries: ["/"] },
  )
  return render(<RouterProvider router={router} />)
}

describe("ParticipantLikert", () => {
  it("says plainly when the person never answered the scale", () => {
    renderLikert([])

    expect(
      screen.getByText("Esta pessoa ainda não respondeu a escala."),
    ).toBeInTheDocument()
  })

  it("says the answers could not be loaded", () => {
    renderLikert(null)

    expect(
      screen.getByText(
        "Não foi possível carregar as respostas da escala. Recarregue a página.",
      ),
    ).toBeInTheDocument()
  })

  it("lists every submission by date, the latest marked, each linking to its page", () => {
    renderLikert(two)

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)

    expect(items[0]).toHaveTextContent("10/11/26")
    expect(within(items[0]).getByText("mais recente")).toBeInTheDocument()
    expect(
      within(items[0]).getByRole("link", { name: "Ver respostas" }),
    ).toHaveAttribute(
      "href",
      `/admin/participantes/${profileId}/escala/${latestId}`,
    )

    expect(items[1]).toHaveTextContent("01/10/26")
    expect(within(items[1]).queryByText("mais recente")).not.toBeInTheDocument()
    expect(
      within(items[1]).getByRole("link", { name: "Ver respostas" }),
    ).toHaveAttribute(
      "href",
      `/admin/participantes/${profileId}/escala/${olderId}`,
    )
  })

  it("carries the event along so the page can lead back to it", () => {
    renderLikert(two, eventId)

    expect(
      screen.getAllByRole("link", { name: "Ver respostas" })[0],
    ).toHaveAttribute(
      "href",
      `/admin/participantes/${profileId}/escala/${latestId}?evento=${eventId}`,
    )
  })
})

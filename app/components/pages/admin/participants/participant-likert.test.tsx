import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import type { ParticipantLikert as ParticipantLikertData } from "~/business/profile/participant-likert.server"
import { render, screen, within } from "~/test/test-utils"
import { ParticipantLikert } from "./participant-likert"

const latestId = "aaaaaaaa-1111-4111-8111-111111111111"
const olderId = "bbbbbbbb-2222-4222-8222-222222222222"

const latest = {
  id: latestId,
  profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
  submittedAt: new Date("2026-11-10T15:00:00Z"),
  beenTo: [],
  nonMonogamySince: null,
  answers: [
    {
      statementKey: "ciume",
      statementText: "Sinto ciúme e sei conversar sobre isso.",
      answer: 4,
      comment: "Depende do dia.",
    },
    {
      statementKey: "consentimento",
      statementText: "Peço consentimento antes de tocar alguém.",
      answer: 5,
      comment: null,
    },
  ],
}

const withTwo: ParticipantLikertData = {
  submissions: [
    { id: latestId, submittedAt: new Date("2026-11-10T15:00:00Z") },
    { id: olderId, submittedAt: new Date("2026-10-01T15:00:00Z") },
  ],
  selected: latest,
}

const renderLikert = (likert: ParticipantLikertData | null) => {
  const router = createMemoryRouter(
    [{ path: "/", element: <ParticipantLikert likert={likert} /> }],
    { initialEntries: ["/"] },
  )
  return render(<RouterProvider router={router} />)
}

describe("ParticipantLikert", () => {
  it("says plainly when the person never answered the scale", () => {
    renderLikert({ submissions: [], selected: null })

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

  it("shows every statement of the open submission with its answer and comment", () => {
    renderLikert(withTwo)

    expect(screen.getByText(/10 de novembro de 2026/)).toBeInTheDocument()

    const answers = within(
      screen.getByRole("list", { name: "Respostas" }),
    ).getAllByRole("listitem")
    expect(answers).toHaveLength(2)

    const first = within(answers[0])
    expect(
      first.getByText("Sinto ciúme e sei conversar sobre isso."),
    ).toBeInTheDocument()
    expect(first.getByText("Concordo")).toBeInTheDocument()
    expect(first.getByText("Depende do dia.")).toBeInTheDocument()

    const second = within(answers[1])
    expect(second.getByText("Concordo totalmente")).toBeInTheDocument()
    expect(second.getByText("Sem comentário")).toBeInTheDocument()
  })

  it("lists every submission, links each one and marks the open one", () => {
    renderLikert(withTwo)

    const list = screen.getByRole("navigation", { name: "Envios" })
    const links = within(list).getAllByRole("link")

    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", `/?envio=${latestId}`)
    expect(links[0]).toHaveAttribute("aria-current", "page")
    expect(links[1]).toHaveAttribute("href", `/?envio=${olderId}`)
    expect(links[1]).not.toHaveAttribute("aria-current")
    expect(links[1]).toHaveTextContent("01/10/26")
  })
})

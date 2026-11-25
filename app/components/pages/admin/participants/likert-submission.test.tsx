import type { ComponentProps } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import { render, screen, within } from "~/test/test-utils"
import { LikertSubmission } from "./likert-submission"

const profileId = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
const eventId = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"
const newerId = "aaaaaaaa-1111-4111-8111-111111111111"
const olderId = "cccccccc-3333-4333-8333-333333333333"

const props: ComponentProps<typeof LikertSubmission> = {
  profileId,
  name: "Ana",
  eventId: null,
  newerId,
  olderId,
  submission: {
    id: "bbbbbbbb-2222-4222-8222-222222222222",
    profileId,
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
        answer: 1,
        comment: null,
      },
    ],
  },
}

const renderPage = (overrides: Partial<typeof props> = {}) => {
  const router = createMemoryRouter(
    [{ path: "/", element: <LikertSubmission {...props} {...overrides} /> }],
    { initialEntries: ["/"] },
  )
  return render(<RouterProvider router={router} />)
}

describe("LikertSubmission", () => {
  it("names the person and the date of the submission", () => {
    renderPage()

    expect(
      screen.getByRole("heading", { name: "Escala de Likert de Ana" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/10 de novembro de 2026/)).toBeInTheDocument()
  })

  it("shows one row per statement with the answer and the comment", () => {
    renderPage()

    const rows = screen.getAllByRole("row").slice(1)
    expect(rows).toHaveLength(2)

    const first = within(rows[0])
    expect(
      first.getByText("Sinto ciúme e sei conversar sobre isso."),
    ).toBeInTheDocument()
    expect(first.getByText("Concordo")).toBeInTheDocument()
    expect(first.getByText("Depende do dia.")).toBeInTheDocument()

    const second = within(rows[1])
    expect(second.getByText("Discordo totalmente")).toBeInTheDocument()
    expect(second.getByText("—")).toBeInTheDocument()
  })

  it("goes back to the person's page", () => {
    renderPage()

    expect(
      screen.getByRole("link", { name: /Voltar para a participante/ }),
    ).toHaveAttribute("href", `/admin/participantes/${profileId}`)
  })

  it("goes back to the event page the admin came from, and keeps it while browsing", () => {
    renderPage({ eventId })

    expect(
      screen.getByRole("link", { name: /Voltar para a participante/ }),
    ).toHaveAttribute(
      "href",
      `/admin/eventos/${eventId}/participantes/${profileId}`,
    )
    expect(
      screen.getByRole("link", { name: /Envio anterior/ }),
    ).toHaveAttribute(
      "href",
      `/admin/participantes/${profileId}/escala/${olderId}?evento=${eventId}`,
    )
  })

  it("moves to the newer and the older submission", () => {
    renderPage()

    expect(
      screen.getByRole("link", { name: /Envio mais novo/ }),
    ).toHaveAttribute(
      "href",
      `/admin/participantes/${profileId}/escala/${newerId}`,
    )
    expect(
      screen.getByRole("link", { name: /Envio anterior/ }),
    ).toHaveAttribute(
      "href",
      `/admin/participantes/${profileId}/escala/${olderId}`,
    )
  })

  it("offers no move past the first or the latest submission", () => {
    renderPage({ newerId: null, olderId: null })

    expect(
      screen.queryByRole("link", { name: /Envio mais novo/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /Envio anterior/ }),
    ).not.toBeInTheDocument()
  })
})

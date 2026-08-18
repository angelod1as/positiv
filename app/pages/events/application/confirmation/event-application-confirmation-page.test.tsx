import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import EventApplicationConfirmationPage, {
  meta,
} from "./event-application-confirmation-page"

const renderPage = () => {
  const router = createMemoryRouter(
    [
      {
        path: "/dashboard/:id/candidatura-enviada",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        element: <EventApplicationConfirmationPage {...({} as any)} />,
      },
      { path: "/dashboard", element: <div>Dashboard</div> },
    ],
    { initialEntries: ["/dashboard/an-event-id/candidatura-enviada"] },
  )

  return render(<RouterProvider router={router} />)
}

describe("Event application confirmation page", () => {
  it("tells the person the application was received", () => {
    renderPage()
    expect(
      screen.getByRole("heading", { name: "Candidatura enviada! 🎉" }),
    ).toBeInTheDocument()
  })

  it("says a candidatura is not a spot at the event", () => {
    renderPage()
    expect(
      screen.getByText(/candidatura não garante uma vaga/),
    ).toBeInTheDocument()
  })

  it("explains that the organization selects and gets in touch", () => {
    renderPage()
    expect(
      screen.getByText(/a organização seleciona quem vai e entra em contato/),
    ).toBeInTheDocument()
  })

  it("says the event details are coming by email", () => {
    renderPage()
    expect(
      screen.getByText(/um e-mail com os detalhes do evento/),
    ).toBeInTheDocument()
  })

  it("links back to the dashboard", () => {
    renderPage()
    expect(
      screen.getByRole("link", { name: "Voltar para o painel" }),
    ).toHaveAttribute("href", "/dashboard")
  })

  it("sets the page title", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleMeta = meta({} as any).find((m) => "title" in m)
    expect(titleMeta).toEqual({ title: "Candidatura enviada | Positiv Party" })
  })
})

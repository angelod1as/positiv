import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import AccountReadyPage, { meta } from "./account-ready-page"

const renderPage = () => {
  const router = createMemoryRouter(
    [
      {
        path: "/conta/tudo-pronto",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        element: <AccountReadyPage {...({} as any)} />,
      },
      { path: "/dashboard", element: <div>Dashboard</div> },
    ],
    { initialEntries: ["/conta/tudo-pronto"] },
  )

  return render(<RouterProvider router={router} />)
}

describe("Account ready page", () => {
  it("tells the person the account is ready", () => {
    renderPage()
    expect(
      screen.getByRole("heading", { name: "Sua conta está pronta! 🎉" }),
    ).toBeInTheDocument()
  })

  it("says an account is not a spot at a party", () => {
    renderPage()
    expect(
      screen.getByText(
        "Mas atenção: ter conta na Positiv não é o mesmo que estar em uma festa.",
      ),
    ).toBeInTheDocument()
  })

  it("explains that each event has its own registration", () => {
    renderPage()
    expect(
      screen.getByText(
        "Cada evento tem inscrição própria. Para ir a um evento, você precisa se inscrever nele — e a inscrição vale só para aquele evento.",
      ),
    ).toBeInTheDocument()
  })

  it("explains that registration is followed by selection", () => {
    renderPage()
    expect(
      screen.getByText(
        "Depois que você se inscreve, a organização seleciona quem vai. Você recebe a resposta por email.",
      ),
    ).toBeInTheDocument()
  })

  it("links to the dashboard", () => {
    renderPage()
    expect(
      screen.getByRole("link", { name: "Ver eventos com inscrições abertas" }),
    ).toHaveAttribute("href", "/dashboard")
  })

  it("sets the page title", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleMeta = meta({} as any).find((m) => "title" in m)
    expect(titleMeta).toEqual({ title: "Tudo pronto | Positiv Party" })
  })
})

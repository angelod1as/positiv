import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { render, renderWithRouter, screen } from "~/test/test-utils"
import { ContentLink } from "./content-link"

describe("ContentLink", () => {
  it("routes an internal href through the client-side router", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={<ContentLink href="/eventos">os eventos</ContentLink>}
          />
          <Route path="/eventos" element={<p>Lista de eventos</p>} />
        </Routes>
      </MemoryRouter>,
    )

    const link = screen.getByRole("link", { name: "os eventos" })
    expect(link).toHaveAttribute("href", "/eventos")
    expect(link).not.toHaveAttribute("target")
    expect(link).toHaveClass("underline")

    await user.click(link)

    expect(screen.getByText("Lista de eventos")).toBeInTheDocument()
  })

  it("opens an external href in a new tab", () => {
    renderWithRouter(
      <ContentLink href="https://instagram.com/positivparty">
        Instagram
      </ContentLink>,
    )

    const link = screen.getByRole("link", { name: "Instagram" })
    expect(link).toHaveAttribute("href", "https://instagram.com/positivparty")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
    expect(link).toHaveClass("underline")
  })
})

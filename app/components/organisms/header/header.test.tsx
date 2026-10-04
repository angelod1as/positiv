import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { headerCopy } from "~/copy/layout"
import { renderWithRouter, screen, within } from "~/test/test-utils"
import { Header } from "./header"

const navigation = [
  { _key: "sobre", label: "Sobre", href: "/sobre" },
  { _key: "instagram", label: "Instagram", href: "https://instagram.com/x" },
]

function renderHeader(links = navigation) {
  return renderWithRouter(
    <Header profile={null} isThereAnyNews={false} navigation={links} />,
  )
}

describe("Header", () => {
  it("renders the Navigation links in order", () => {
    renderHeader()

    const nav = screen.getByRole("navigation", {
      name: headerCopy.navigationLabel,
    })
    const links = within(nav).getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual([
      "Sobre",
      "Instagram",
    ])
    expect(links[0]).toHaveAttribute("href", "/sobre")
  })

  it("opens a link to another site in a new tab", () => {
    renderHeader()

    const nav = screen.getByRole("navigation", {
      name: headerCopy.navigationLabel,
    })
    expect(within(nav).getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "target",
      "_blank",
    )
  })

  it("keeps the Platform's login button after the Navigation", () => {
    renderHeader()

    const nav = screen.getByRole("navigation", {
      name: headerCopy.navigationLabel,
    })
    const login = screen.getByRole("link", { name: headerCopy.login })
    expect(
      nav.compareDocumentPosition(login) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("lists the Navigation in a menu on small screens", async () => {
    renderHeader()

    await userEvent.click(
      screen.getByRole("button", { name: headerCopy.openMenu }),
    )

    const menu = screen.getByRole("dialog", { name: headerCopy.menuTitle })
    expect(
      within(menu)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Sobre", "Instagram"])
  })

  it("closes the menu once a link in it is followed", async () => {
    renderHeader()

    await userEvent.click(
      screen.getByRole("button", { name: headerCopy.openMenu }),
    )
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("link", { name: "Sobre" }),
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders no Navigation and no menu without links", () => {
    renderHeader([])

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: headerCopy.openMenu }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: headerCopy.login }),
    ).toBeInTheDocument()
  })
})

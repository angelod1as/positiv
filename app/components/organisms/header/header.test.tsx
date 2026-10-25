import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { portableTextSchema } from "~/business/cms/content.schema"
import { headerCopy, noticeCopy } from "~/copy/layout"
import { paragraph } from "~/test/page-documents"
import { render, renderWithDataRouter, renderWithRouter, screen, within } from "~/test/test-utils"
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

describe("Header — the admin link", () => {
  const profile = (permissions: string[]) => ({
    id: "profile-1",
    email: "someone@example.com",
    full_name: "Someone",
    basic_data_filled: true,
    created_at: "2024-01-01T00:00:00Z",
    permissions,
  })

  const renderFor = (permissions: string[]) =>
    renderWithDataRouter(
      <Header profile={profile(permissions)} isThereAnyNews={false} />,
    )

  it("shows the admin area to whoever may enter the admin panel", () => {
    renderFor(["admin.panel", "events.apply_direct"])

    expect(screen.getByTitle(headerCopy.adminTitle)).toBeInTheDocument()
  })

  it("hides it from a staff", () => {
    renderFor(["events.apply_direct"])

    expect(screen.queryByTitle(headerCopy.adminTitle)).not.toBeInTheDocument()
  })
})

describe("Header", () => {
  const openMenu = () =>
    userEvent.click(screen.getByRole("button", { name: headerCopy.openMenu }))

  it("keeps the Navigation behind the menu button at every width", () => {
    renderHeader()

    expect(
      screen.getByRole("button", { name: headerCopy.openMenu }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Sobre" })).not.toBeInTheDocument()
  })

  it("lists the Navigation links in order in the menu", async () => {
    renderHeader()

    await openMenu()

    const menu = screen.getByRole("dialog", { name: headerCopy.menuTitle })
    const nav = within(menu).getByRole("navigation", {
      name: headerCopy.navigationLabel,
    })
    const links = within(nav).getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual([
      "Sobre",
      "Instagram",
    ])
    expect(links[0]).toHaveAttribute("href", "/sobre")
  })

  it("opens a link to another site in a new tab", async () => {
    renderHeader()

    await openMenu()

    expect(
      within(screen.getByRole("dialog")).getByRole("link", {
        name: "Instagram",
      }),
    ).toHaveAttribute("target", "_blank")
  })

  it("keeps the Platform's login button outside the menu, after its button", () => {
    renderHeader()

    const menuButton = screen.getByRole("button", { name: headerCopy.openMenu })
    const login = screen.getByRole("link", { name: headerCopy.login })
    expect(
      menuButton.compareDocumentPosition(login) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
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

  it("closes the menu once a link to another site in it is followed", async () => {
    renderHeader()

    await userEvent.click(
      screen.getByRole("button", { name: headerCopy.openMenu }),
    )
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("link", {
        name: "Instagram",
      }),
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("closes the menu on Escape and hands focus back to its button", async () => {
    renderHeader()
    const menuButton = screen.getByRole("button", { name: headerCopy.openMenu })

    await openMenu()
    expect(screen.getByRole("dialog")).toContainElement(
      document.activeElement as HTMLElement,
    )

    await userEvent.keyboard("{Escape}")

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(menuButton).toHaveFocus()
  })

  it("marks the current page in the menu", async () => {
    render(
      <Header profile={null} isThereAnyNews={false} navigation={navigation} />,
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <MemoryRouter initialEntries={["/sobre"]}>{children}</MemoryRouter>
        ),
      },
    )

    await openMenu()

    const menu = screen.getByRole("dialog")
    expect(within(menu).getByRole("link", { name: "Sobre" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(
      within(menu).getByRole("link", { name: "Instagram" }),
    ).not.toHaveAttribute("aria-current")
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

  describe("the Notice", () => {
    const onPlatformPage = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/dashboard"]}>{children}</MemoryRouter>
    )

    it("shows the Notice on every page", async () => {
      render(
        <Header
          profile={null}
          isThereAnyNews={false}
          notice={portableTextSchema.parse(paragraph("Inscrições abertas!"))}
        />,
        { wrapper: onPlatformPage },
      )

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Inscrições abertas!",
      )
    })

    it("says when the editorial system is unavailable", () => {
      render(
        <Header
          profile={null}
          isThereAnyNews={false}
          editorialSystemUnavailable
        />,
        { wrapper: onPlatformPage },
      )

      expect(screen.getByRole("alert")).toHaveTextContent(
        noticeCopy.editorialSystemUnavailable,
      )
    })
  })

  describe("the space it takes", () => {
    let report: ResizeObserverCallback = () => {}
    const headerHeight = () =>
      document.documentElement.style.getPropertyValue("--site-header-height")

    beforeEach(() => {
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(callback: ResizeObserverCallback) {
            report = callback
          }
          observe() {}
          disconnect() {}
        },
      )
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      document.documentElement.style.removeProperty("--site-header-height")
    })

    it("tells the page how tall it is, so a Notice never covers the content", () => {
      renderHeader()

      report(
        [{ borderBoxSize: [{ blockSize: 120 }] } as never],
        {} as ResizeObserver,
      )

      expect(headerHeight()).toBe("120px")
    })

    it("measures itself in a browser that reports no border box", () => {
      renderHeader()

      report(
        [
          {
            target: { getBoundingClientRect: () => ({ height: 96 }) },
          } as never,
        ],
        {} as ResizeObserver,
      )

      expect(headerHeight()).toBe("96px")
    })

    it("stops claiming space once it is gone", () => {
      const { unmount } = renderHeader()
      report(
        [{ borderBoxSize: [{ blockSize: 120 }] } as never],
        {} as ResizeObserver,
      )

      unmount()

      expect(headerHeight()).toBe("")
    })
  })
})

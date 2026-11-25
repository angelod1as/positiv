import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
  getUserContext: vi.fn(),
  logoutUser: vi.fn(),
}))

vi.mock("~/business/profile/likert-answers.server", () => ({
  showsLikertEntryPoints: vi.fn(),
}))

import { getUserContext } from "~/business/auth/auth.server"
import { showsLikertEntryPoints } from "~/business/profile/likert-answers.server"
import AccountPage, { loader } from "./account-page"

type PageProps = Parameters<typeof AccountPage>[0]
type LoaderArgs = Parameters<typeof loader>[0]

const currentProfile = {
  id: "profile-1",
  permissions: [],
  basic_data_filled: true,
}

const renderPage = (loaderData: PageProps["loaderData"]) => {
  const router = createMemoryRouter(
    [
      {
        path: "/conta",
        element: <AccountPage {...({ loaderData } as PageProps)} />,
        action: () => null,
      },
    ],
    { initialEntries: ["/conta"] },
  )
  return render(<RouterProvider router={router} />)
}

describe("AccountPage loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserContext).mockResolvedValue({
      currentProfile,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>)
  })

  it.each([true, false])(
    "says whether the Likert scale is linked from the account (%s)",
    async (shown) => {
      vi.mocked(showsLikertEntryPoints).mockResolvedValue(shown)

      const result = await loader({
        request: new Request("http://localhost/conta"),
        params: {},
      } as unknown as LoaderArgs)

      expect(result).toEqual({ basic_data_filled: true, likert: shown })
    },
  )
})

describe("AccountPage", () => {
  it("links to Seus e-mails", () => {
    renderPage({ basic_data_filled: true, likert: false })

    expect(screen.getByRole("link", { name: "Seus e-mails" })).toHaveAttribute(
      "href",
      "/emails",
    )
  })

  it("links to the Likert scale once it is required", () => {
    renderPage({ basic_data_filled: true, likert: true })

    expect(
      screen.getByRole("link", { name: "Escala de Likert" }),
    ).toHaveAttribute("href", "/conta/escala")
  })

  it("leaves the link out while the scale is hidden", () => {
    renderPage({ basic_data_filled: true, likert: false })

    expect(screen.queryByRole("link", { name: "Escala de Likert" })).toBeNull()
  })

  // The Likert draft outlives the tab, so the next person at a shared
  // computer must not find someone else's answers left behind.
  it("clears the Likert drafts kept in this browser on sign-out", async () => {
    const user = userEvent.setup()
    localStorage.setItem("form-runtime:likert:profile-1:abc", "{}")
    localStorage.setItem("likert-order:profile-1:abc", "[]")
    localStorage.setItem("outra-coisa", "fica")
    renderPage({ basic_data_filled: true, likert: false })

    await user.click(screen.getByRole("button", { name: "Deslogar conta" }))

    expect(localStorage.getItem("form-runtime:likert:profile-1:abc")).toBeNull()
    expect(localStorage.getItem("likert-order:profile-1:abc")).toBeNull()
    expect(localStorage.getItem("outra-coisa")).toBe("fica")
  })
})

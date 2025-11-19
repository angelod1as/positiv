import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useNewsletterStatus } from "~/lib/hooks/use-newsletter-status"
import { useRootData } from "~/lib/hooks/use-root-data"
import type { ProfileWithRoles } from "~types/database/entities.types"
import { NewsletterSubscriptionModal } from "./newsletter-subscription-modal"

vi.mock("~/lib/hooks/use-newsletter-status")
vi.mock("~/lib/hooks/use-root-data")

describe("NewsletterSubscriptionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  const createTestRouter = (
    shouldShow: boolean,
    path: string = "/",
    profile: Partial<ProfileWithRoles> = { id: "test-profile" },
  ) => {
    vi.mocked(useNewsletterStatus).mockReturnValue(shouldShow)
    vi.mocked(useRootData).mockReturnValue({
      currentProfile: profile as ProfileWithRoles,
      currentUser: null,
      isProdInDev: false,
      toast: undefined,
    })

    return createMemoryRouter(
      [
        {
          path: "/",
          element: <NewsletterSubscriptionModal />,
        },
        {
          path: "/entrar",
          element: <NewsletterSubscriptionModal />,
        },
      ],
      {
        initialEntries: [path],
      },
    )
  }

  it("should render modal when shouldShow is true", () => {
    const router = createTestRouter(true)
    render(<RouterProvider router={router} />)

    expect(
      screen.getByRole("heading", { name: /cadastre-se na nossa newsletter/i }),
    ).toBeInTheDocument()
  })

  it("should not render modal when shouldShow is false", () => {
    const router = createTestRouter(false)
    render(<RouterProvider router={router} />)

    expect(
      screen.queryByRole("heading", {
        name: /cadastre-se na nossa newsletter/i,
      }),
    ).not.toBeInTheDocument()
  })

  it("should not render modal on auth flow paths", () => {
    const router = createTestRouter(true, "/entrar")
    render(<RouterProvider router={router} />)

    expect(
      screen.queryByRole("heading", {
        name: /cadastre-se na nossa newsletter/i,
      }),
    ).not.toBeInTheDocument()
  })

  it("should render subscribe and dismiss buttons", () => {
    const router = createTestRouter(true)
    render(<RouterProvider router={router} />)

    expect(
      screen.getByRole("button", { name: /inscrever-me/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /talvez mais tarde/i }),
    ).toBeInTheDocument()
  })

  it("should have subscribe button that is not disabled initially", () => {
    const router = createTestRouter(true)
    render(<RouterProvider router={router} />)

    const subscribeButton = screen.getByRole("button", { name: /inscrever-me/i })
    expect(subscribeButton).not.toBeDisabled()
  })
})

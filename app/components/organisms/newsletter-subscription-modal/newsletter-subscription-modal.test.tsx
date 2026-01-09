import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { NewsletterSubscriptionModal } from "./newsletter-subscription-modal"

describe("NewsletterSubscriptionModal", () => {
  const createTestRouter = (open: boolean) => {
    return createMemoryRouter(
      [
        {
          path: "/",
          element: <NewsletterSubscriptionModal open={open} />,
        },
      ],
      {
        initialEntries: ["/"],
      },
    )
  }

  it("should render modal when open is true", () => {
    const router = createTestRouter(true)
    render(<RouterProvider router={router} />)

    expect(
      screen.getByRole("heading", { name: /cadastre-se na nossa newsletter/i }),
    ).toBeInTheDocument()
  })

  it("should not render modal when open is false", () => {
    const router = createTestRouter(false)
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

    const subscribeButton = screen.getByRole("button", {
      name: /inscrever-me/i,
    })
    expect(subscribeButton).not.toBeDisabled()
  })
})

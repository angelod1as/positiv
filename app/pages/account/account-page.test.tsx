import { describe, expect, it, vi } from "vitest"
import { renderWithDataRouter, screen } from "~/test/test-utils"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
  getUserContext: vi.fn(),
  logoutUser: vi.fn(),
}))

import AccountPage from "./account-page"

type PageProps = Parameters<typeof AccountPage>[0]

describe("AccountPage", () => {
  it("links to Seus e-mails", () => {
    renderWithDataRouter(
      <AccountPage
        {...({ loaderData: { basic_data_filled: true } } as unknown as PageProps)}
      />,
    )

    expect(screen.getByRole("link", { name: "Seus e-mails" })).toHaveAttribute(
      "href",
      "/emails",
    )
  })
})

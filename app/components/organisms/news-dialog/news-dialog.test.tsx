import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useFetcher } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useNewsStatus } from "~/lib/hooks/use-news-status"
import type { ProfileWithRoles } from "~types/database/entities.types"
import { NewsDialog } from "./news-dialog"

vi.mock("react-router", () => ({
  useFetcher: vi.fn(),
}))

vi.mock("~/lib/hooks/use-news-status", () => ({
  useNewsStatus: vi.fn(),
}))

vi.mock("./news", () => ({
  News: vi.fn(({ isAdmin }: { isAdmin: boolean }) => {
    const mockNewsItems = [
      {
        id: "1",
        title: "Regular Feature Update",
        content: "Now you can export reports in PDF format",
        isAdmin: false,
        createdAt: new Date(),
        isActive: true,
      },
      {
        id: "2",
        title: "Admin-Only Update",
        content: "New dashboard metrics are available for monitoring",
        isAdmin: true,
        createdAt: new Date(),
        isActive: true,
      },
    ]
    const filtered = mockNewsItems.filter((item) => !item.isAdmin || isAdmin)
    return (
      <div>
        {filtered.map((item) => (
          <div key={item.id}>
            <h4>{item.title}</h4>
            <p>{item.content}</p>
          </div>
        ))}
      </div>
    )
  }),
}))

vi.mock("./news-utils", () => ({
  hasVisibleNews: vi.fn(() => true),
  DEFAULT_NEWS_ITEMS: [],
  NEWS_VERSION: 123456789,
}))

describe("NewsDialog", () => {
  const mockSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useFetcher).mockReturnValue({
      submit: mockSubmit,
    } as unknown as ReturnType<typeof useFetcher>)

    // Default mock: news should be shown
    vi.mocked(useNewsStatus).mockReturnValue(true)

    Object.defineProperty(window, "location", {
      value: { href: "http://localhost:3000/test" },
      writable: true,
    })
  })

  describe("Dialog visibility based on NEWS_VERSION", () => {
    it("should show bell icon in header when there is news", () => {
      vi.mocked(useNewsStatus).mockReturnValue(true)

      render(<NewsDialog isHeader={true} currentProfile={null} />)

      const button = screen.getByRole("button")
      expect(button).toBeInTheDocument()
      expect(button.querySelector("svg")).toBeInTheDocument()
    })

    it("should not show bell icon in header when there is no news", () => {
      vi.mocked(useNewsStatus).mockReturnValue(false)

      render(<NewsDialog isHeader={true} currentProfile={null} />)

      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("should not show bell icon for regular user when only admin news exist", async () => {
      const { hasVisibleNews } = await import("./news-utils")
      // Mock hasVisibleNews to return false for regular users
      vi.mocked(hasVisibleNews).mockImplementation(
        (isAdmin: boolean) => isAdmin,
      )

      vi.mocked(useNewsStatus).mockReturnValue(true)

      const regularProfile: ProfileWithRoles = {
        id: "1",
        email: "user@test.com",
        full_name: "Regular User",
        is_admin: false,
        basic_data_filled: true,
        social_name: null,
        pronouns: null,
        rg: null,
        cpf: null,
        phone: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        where_lives: null,
        how_came_to_us: null,
        rg_issuer: null,
        created_at: "2024-01-01",
      }

      render(<NewsDialog isHeader={true} currentProfile={regularProfile} />)

      expect(screen.queryByRole("button")).not.toBeInTheDocument()

      // Reset mock to default behavior
      vi.mocked(hasVisibleNews).mockImplementation(() => true)
    })

    it("should show footer link regardless of news status", () => {
      vi.mocked(useNewsStatus).mockReturnValue(false)

      render(<NewsDialog isHeader={false} currentProfile={null} />)

      expect(screen.getByText("Veja as novidades do site")).toBeInTheDocument()
    })
  })

  describe("Role-based content filtering", () => {
    it("should pass isAdmin=false for regular users", async () => {
      const regularProfile: ProfileWithRoles = {
        id: "1",
        email: "user@test.com",
        full_name: "Regular User",
        is_admin: false,
        basic_data_filled: true,
        social_name: null,
        pronouns: null,
        rg: null,
        cpf: null,
        phone: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        where_lives: null,
        how_came_to_us: null,
        rg_issuer: null,
        created_at: "2024-01-01",
      }

      render(<NewsDialog isHeader={false} currentProfile={regularProfile} />)

      const user = userEvent.setup()
      await user.click(screen.getByText("Veja as novidades do site"))

      expect(screen.getByText("Regular Feature Update")).toBeInTheDocument()
      expect(screen.queryByText("Admin-Only Update")).not.toBeInTheDocument()
    })

    it("should pass isAdmin=true for admin users", async () => {
      const adminProfile: ProfileWithRoles = {
        id: "1",
        email: "admin@test.com",
        full_name: "Admin User",
        is_admin: true,
        basic_data_filled: true,
        social_name: null,
        pronouns: null,
        rg: null,
        cpf: null,
        phone: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        where_lives: null,
        how_came_to_us: null,
        rg_issuer: null,
        created_at: "2024-01-01",
      }

      render(<NewsDialog isHeader={false} currentProfile={adminProfile} />)

      const user = userEvent.setup()
      await user.click(screen.getByText("Veja as novidades do site"))

      expect(screen.getByText("Regular Feature Update")).toBeInTheDocument()
      expect(screen.getByText("Admin-Only Update")).toBeInTheDocument()
    })
  })

  describe("User interaction", () => {
    it('should submit form when clicking "don\'t show again"', async () => {
      render(<NewsDialog isHeader={false} currentProfile={null} />)

      const user = userEvent.setup()
      await user.click(screen.getByText("Veja as novidades do site"))

      const confirmButton = screen.getByText("Não mostrar isso novamente")
      await user.click(confirmButton)

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          newsVersion: expect.stringMatching(/^\d+$/), // Should be a numeric string
          intent: "news-update",
          thisUrl: "http://localhost:3000/test",
        }),
        { method: "POST" },
      )
    })
  })
})

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ProfileUpdateGuard } from "./profile-update-guard"
import { BrowserRouter } from "react-router"
import type { ProfileWithRoles } from "~types/database/entities.types"

vi.mock("~/lib/hooks/use-profile", () => ({
  useProfile: vi.fn(),
}))

const mockProfile: ProfileWithRoles = {
  id: "123",
  full_name: "Test User",
  race_color: null,
  is_admin: false,
  created_at: new Date().toISOString(),
  basic_data_filled: false,
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe("ProfileUpdateGuard", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useProfile } = await import("~/lib/hooks/use-profile")
    vi.mocked(useProfile).mockReturnValue({
      data: mockProfile,
    } as unknown as ReturnType<typeof useProfile>)
  })

  it("should not render modal when user is not logged in", async () => {
    const { useProfile } = await import("~/lib/hooks/use-profile")
    vi.mocked(useProfile).mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof useProfile>)

    render(<ProfileUpdateGuard currentPath="/dashboard" needsProfileUpdate={true} />, { wrapper })

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("should not render modal when on exempt path", () => {
    render(
      <ProfileUpdateGuard currentPath="/conta/dados-basicos" needsProfileUpdate={true} />,
      { wrapper },
    )

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("should not render modal when profile does not need update", () => {
    render(
      <ProfileUpdateGuard currentPath="/dashboard" needsProfileUpdate={false} />,
      { wrapper },
    )

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("should render modal when logged in, not exempt path, and needs update", () => {
    render(
      <ProfileUpdateGuard currentPath="/dashboard" needsProfileUpdate={true} />,
      { wrapper },
    )

    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("should not render modal on home page (exempt)", () => {
    render(<ProfileUpdateGuard currentPath="/" needsProfileUpdate={true} />, { wrapper })

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("should not render modal on login page (exempt)", () => {
    render(<ProfileUpdateGuard currentPath="/entrar" needsProfileUpdate={true} />, { wrapper })

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })
})
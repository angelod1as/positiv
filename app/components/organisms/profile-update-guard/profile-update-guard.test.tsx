import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProfileUpdateGuard } from "./profile-update-guard"
import { BrowserRouter } from "react-router"
import type { ProfileWithRoles } from "~types/database/entities.types"

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
  it("should not render modal when user is not logged in", () => {
    render(
      <ProfileUpdateGuard
        currentProfile={null}
        currentPath="/dashboard"
        needsProfileUpdate={true}
      />,
      { wrapper },
    )

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("should not render modal when on exempt path", () => {
    render(
      <ProfileUpdateGuard
        currentProfile={mockProfile}
        currentPath="/conta/dados-basicos"
        needsProfileUpdate={true}
      />,
      { wrapper },
    )

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("should not render modal when profile does not need update", () => {
    render(
      <ProfileUpdateGuard
        currentProfile={mockProfile}
        currentPath="/dashboard"
        needsProfileUpdate={false}
      />,
      { wrapper },
    )

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("should render modal when logged in, not exempt path, and needs update", () => {
    render(
      <ProfileUpdateGuard
        currentProfile={mockProfile}
        currentPath="/dashboard"
        needsProfileUpdate={true}
      />,
      { wrapper },
    )

    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("should not render modal on home page (exempt)", () => {
    render(
      <ProfileUpdateGuard
        currentProfile={mockProfile}
        currentPath="/"
        needsProfileUpdate={true}
      />,
      { wrapper },
    )

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("should not render modal on login page (exempt)", () => {
    render(
      <ProfileUpdateGuard
        currentProfile={mockProfile}
        currentPath="/entrar"
        needsProfileUpdate={true}
      />,
      { wrapper },
    )

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })
})
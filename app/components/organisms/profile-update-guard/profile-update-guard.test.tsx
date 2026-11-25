import { BrowserRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import type { ProfileWithRoles } from "~types/database/entities.types"
import { ProfileUpdateGuard } from "./profile-update-guard"

const mockProfile: ProfileWithRoles = {
  id: "123",
  full_name: "Test User",
  race_color: null,
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
        needsEmailConfirmation={false}
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
        needsEmailConfirmation={false}
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
        needsEmailConfirmation={false}
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
        needsEmailConfirmation={false}
      />,
      { wrapper },
    )

    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("says the phone is one of the things to fix", () => {
    render(
      <ProfileUpdateGuard
        currentProfile={mockProfile}
        currentPath="/dashboard"
        needsProfileUpdate={true}
        needsEmailConfirmation={false}
      />,
      { wrapper },
    )

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /celular válido para falarmos com você pelo WhatsApp/,
    )
  })

  it("should not render modal on home page (exempt)", () => {
    render(
      <ProfileUpdateGuard
        currentProfile={mockProfile}
        currentPath="/"
        needsProfileUpdate={true}
        needsEmailConfirmation={false}
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
        needsEmailConfirmation={false}
      />,
      { wrapper },
    )

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  describe("email choices still to confirm", () => {
    const renderGuard = (
      props: Partial<{
        currentPath: string
        needsProfileUpdate: boolean
        needsEmailConfirmation: boolean
      }> = {},
    ) =>
      render(
        <ProfileUpdateGuard
          currentProfile={mockProfile}
          currentPath="/dashboard"
          needsProfileUpdate={false}
          needsEmailConfirmation={true}
          {...props}
        />,
        { wrapper },
      )

    it("asks to confirm the email choices and links to the page", () => {
      renderGuard()

      expect(screen.getByRole("alertdialog")).toHaveTextContent(
        "Agora você escolhe quais e-mails recebe. Confira suas escolhas: sem confirmar, você continua recebendo como hoje.",
      )
      expect(
        screen.getByRole("button", { name: "Conferir meus e-mails" }),
      ).toBeInTheDocument()
    })

    it("stays out of the way on the email page itself", () => {
      renderGuard({ currentPath: "/emails" })

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })

    it("asks for the profile first when both are due", () => {
      renderGuard({ needsProfileUpdate: true })

      expect(screen.getByRole("alertdialog")).toHaveTextContent(
        "Precisamos que você atualize seus dados básicos.",
      )
      expect(
        screen.queryByRole("button", { name: "Conferir meus e-mails" }),
      ).not.toBeInTheDocument()
    })

    it("asks nothing once the choices are confirmed", () => {
      renderGuard({ needsEmailConfirmation: false })

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
  })
})

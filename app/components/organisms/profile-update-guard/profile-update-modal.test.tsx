import userEvent from "@testing-library/user-event"
import * as ReactRouter from "react-router"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import { ProfileUpdateModal } from "./profile-update-modal"

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

describe("ProfileUpdateModal", () => {
  it("should render modal with description", () => {
    render(<ProfileUpdateModal />)

    expect(screen.getByTestId("profile-update-description")).toBeInTheDocument()
  })

  it("should have exactly one action button", () => {
    render(<ProfileUpdateModal />)

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(1)
  })

  it("should navigate to basic-data path when button is clicked", async () => {
    const mockNavigate = vi.fn()
    vi.mocked(ReactRouter.useNavigate).mockReturnValue(mockNavigate)

    const user = userEvent.setup()
    render(<ProfileUpdateModal />)

    const button = screen.getByRole("button")
    await user.click(button)

    expect(mockNavigate).toHaveBeenCalledWith("/conta/dados-basicos")
  })

  it("offers a way to ask for a CPF exemption in a new tab", () => {
    render(<ProfileUpdateModal cpfExemptionLink="https://wa.me/55?text=oi" />)

    const link = screen.getByRole("link", {
      name: "Não tenho CPF ou sou pessoa estrangeira",
    })
    expect(link).toHaveAttribute("href", "https://wa.me/55?text=oi")
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("offers no exemption when the CPF is not what is missing", () => {
    render(<ProfileUpdateModal cpfExemptionLink={null} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("should render with dialog always open", () => {
    render(<ProfileUpdateModal />)

    const dialog = screen.getByRole("alertdialog")
    expect(dialog).toBeInTheDocument()
  })
})

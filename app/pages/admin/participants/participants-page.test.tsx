import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mockUseLoaderData = vi.fn()

vi.mock("react-router", () => ({
  useLoaderData: () => mockUseLoaderData(),
}))

import ParticipantsPage from "./participants-page"

describe("ParticipantsPage", () => {
  it("should render the page heading", () => {
    mockUseLoaderData.mockReturnValue({ profiles: [] })

    render(<ParticipantsPage />)

    expect(screen.getByRole("heading", { name: /perfis/i })).toBeInTheDocument()
  })

  it("should render a placeholder message when no profiles", () => {
    mockUseLoaderData.mockReturnValue({ profiles: [] })

    render(<ParticipantsPage />)

    expect(screen.getByText(/nenhum perfil encontrado/i)).toBeInTheDocument()
  })

  it("should render profile count when profiles exist", () => {
    mockUseLoaderData.mockReturnValue({
      profiles: [
        { id: "1", full_name: "Test User 1" },
        { id: "2", full_name: "Test User 2" },
      ],
    })

    render(<ParticipantsPage />)

    expect(screen.getByText(/2 perfis/i)).toBeInTheDocument()
  })
})

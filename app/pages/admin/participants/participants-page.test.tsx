import { describe, expect, it, vi } from "vitest"
import { renderWithDataRouter, screen, waitFor } from "~/test/test-utils"

const mockUseLoaderData = vi.fn()

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    useLoaderData: () => mockUseLoaderData(),
  }
})

import ParticipantsPage from "./participants-page"

describe("ParticipantsPage", () => {
  it("should render the page heading", async () => {
    mockUseLoaderData.mockReturnValue({ profiles: [] })

    renderWithDataRouter(<ParticipantsPage />)

    expect(
      screen.getByRole("heading", { name: /perfis/i }),
    ).toBeInTheDocument()
  })

  it("should render AllParticipantsTable with profiles data", async () => {
    mockUseLoaderData.mockReturnValue({
      profiles: [
        {
          id: "1",
          full_name: "Test User 1",
          social_name: "Test 1",
          gender: ["homem cis"],
          orientation: ["heterossexual"],
          is_veteran: true,
          flag: "none",
          where_lives: "São Paulo",
          approved_to_attend: "approved",
          attended_events_count: 5,
          last_attended_event_title: "Evento Teste",
        },
      ],
    })

    renderWithDataRouter(<ParticipantsPage />)

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText("Test 1")).toBeInTheDocument()
    })
  })

  it("should render empty message when no profiles", async () => {
    mockUseLoaderData.mockReturnValue({ profiles: [] })

    renderWithDataRouter(<ParticipantsPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/nenhum perfil encontrado/i),
      ).toBeInTheDocument()
    })
  })
})

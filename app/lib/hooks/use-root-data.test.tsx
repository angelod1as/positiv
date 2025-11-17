import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { useRootData } from "./use-root-data"
import { useMatches } from "react-router"

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    useMatches: vi.fn(),
  }
})

function TestComponent({ testId }: { testId: string }) {
  const rootData = useRootData()
  return (
    <div data-testid={testId}>
      {rootData.currentUser ? rootData.currentUser.email : "no-user"}
    </div>
  )
}

describe("useRootData", () => {
  it("should return root loader data", () => {
    const mockRootData = {
      currentUser: { id: "user-123", email: "test@example.com" },
      currentProfile: {
        id: "profile-123",
        email: "test@example.com",
        social_name: "Test User",
        is_admin: false,
        created_at: "2025-01-01T00:00:00Z",
        basic_data_filled: true,
      },
      isProdInDev: false,
    }

    vi.mocked(useMatches).mockReturnValue([
      {
        id: "root",
        pathname: "/",
        params: {},
        data: mockRootData,
        handle: undefined,
      },
    ])

    render(<TestComponent testId="test-output" />)

    expect(screen.getByText("test@example.com")).toBeInTheDocument()
  })

  it("should handle missing currentUser", () => {
    const mockRootData = {
      currentUser: null,
      currentProfile: null,
      isProdInDev: false,
    }

    vi.mocked(useMatches).mockReturnValue([
      {
        id: "root",
        pathname: "/",
        params: {},
        data: mockRootData,
        handle: undefined,
      },
    ])

    render(<TestComponent testId="test-output" />)

    expect(screen.getByText("no-user")).toBeInTheDocument()
  })

  it("should throw error when root match not found", () => {
    vi.mocked(useMatches).mockReturnValue([])

    expect(() => render(<TestComponent testId="test-output" />)).toThrow(
      "useRootData must be used within a route that has root as an ancestor"
    )
  })

  it("should throw error when root match has no data", () => {
    vi.mocked(useMatches).mockReturnValue([
      {
        id: "root",
        pathname: "/",
        params: {},
        data: undefined,
        handle: undefined,
      },
    ])

    expect(() => render(<TestComponent testId="test-output" />)).toThrow(
      "useRootData must be used within a route that has root as an ancestor"
    )
  })
})

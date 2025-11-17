import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, Outlet } from "react-router"
import { useRootData } from "./use-root-data"

function TestComponent({ testId }: { testId: string }) {
  const rootData = useRootData()
  return (
    <div data-testid={testId}>
      {rootData.currentUser ? rootData.currentUser.email : "no-user"}
    </div>
  )
}

describe("useRootData", () => {
  it("should return root loader data", async () => {
    const mockRootData = {
      currentUser: { id: "user-123", email: "test@example.com" },
      currentProfile: {
        id: "profile-123",
        email: "test@example.com",
        social_name: "Test User",
        is_admin: false,
      },
      isProdInDev: false,
    }

    const router = createMemoryRouter(
      [
        {
          id: "root",
          path: "/",
          loader: () => mockRootData,
          Component: () => <Outlet />,
          children: [
            {
              index: true,
              Component: () => <TestComponent testId="test-output" />,
            },
          ],
        },
      ],
      { initialEntries: ["/"] },
    )

    render(<RouterProvider router={router} />)

    expect(await screen.findByText("test@example.com")).toBeInTheDocument()
  })

  it("should handle missing currentUser", async () => {
    const mockRootData = {
      currentUser: null,
      currentProfile: null,
      isProdInDev: false,
    }

    const router = createMemoryRouter(
      [
        {
          id: "root",
          path: "/",
          loader: () => mockRootData,
          Component: () => <Outlet />,
          children: [
            {
              index: true,
              Component: () => <TestComponent testId="test-output" />,
            },
          ],
        },
      ],
      { initialEntries: ["/"] },
    )

    render(<RouterProvider router={router} />)

    expect(await screen.findByText("no-user")).toBeInTheDocument()
  })
})

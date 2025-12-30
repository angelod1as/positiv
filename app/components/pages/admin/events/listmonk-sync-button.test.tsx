import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { ListmonkSyncButton } from "./listmonk-sync-button"

vi.mock("react-router", () => ({
  useFetcher: () => ({
    Form: ({ children, ...props }: { children: React.ReactNode }) => (
      <form {...props}>{children}</form>
    ),
    state: "idle",
  }),
}))

describe("ListmonkSyncButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render 'Criar Lista' when no list exists", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={null}
        isStale={false}
      />
    )

    expect(screen.getByRole("button", { name: /criar lista/i })).toBeInTheDocument()
  })

  it("should render 'Atualizar Lista' when list exists", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={123}
        isStale={false}
      />
    )

    expect(screen.getByRole("button", { name: /atualizar lista/i })).toBeInTheDocument()
  })

  it("should show warning icon when list is stale", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={123}
        isStale={true}
      />
    )

    expect(screen.getByTestId("stale-warning")).toBeInTheDocument()
  })

  it("should not show warning icon when list is not stale", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={123}
        isStale={false}
      />
    )

    expect(screen.queryByTestId("stale-warning")).not.toBeInTheDocument()
  })

  it("should have correct form intent", async () => {
    render(
      <ListmonkSyncButton
        listmonkListId={null}
        isStale={false}
      />
    )

    const intentInput = document.querySelector('input[name="intent"]')
    expect(intentInput).toHaveValue("sync-listmonk-list")
  })
})

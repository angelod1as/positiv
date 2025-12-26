import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

  it("should not render when event status is Draft", () => {
    render(
      <ListmonkSyncButton
        eventStatus="Draft"
        listmonkListId={null}
        isStale={false}
      />
    )

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("should render 'Criar Lista' when no list exists", () => {
    render(
      <ListmonkSyncButton
        eventStatus="Registration Open"
        listmonkListId={null}
        isStale={false}
      />
    )

    expect(screen.getByRole("button", { name: /criar lista/i })).toBeInTheDocument()
  })

  it("should render 'Atualizar Lista' when list exists", () => {
    render(
      <ListmonkSyncButton
        eventStatus="Registration Closed"
        listmonkListId={123}
        isStale={false}
      />
    )

    expect(screen.getByRole("button", { name: /atualizar lista/i })).toBeInTheDocument()
  })

  it("should show warning icon when list is stale", () => {
    render(
      <ListmonkSyncButton
        eventStatus="Registration Closed"
        listmonkListId={123}
        isStale={true}
      />
    )

    expect(screen.getByTestId("stale-warning")).toBeInTheDocument()
  })

  it("should not show warning icon when list is not stale", () => {
    render(
      <ListmonkSyncButton
        eventStatus="Registration Closed"
        listmonkListId={123}
        isStale={false}
      />
    )

    expect(screen.queryByTestId("stale-warning")).not.toBeInTheDocument()
  })

  it("should render for Scheduled status", () => {
    render(
      <ListmonkSyncButton
        eventStatus="Scheduled"
        listmonkListId={null}
        isStale={false}
      />
    )

    expect(screen.getByRole("button")).toBeInTheDocument()
  })

  it("should render for Registration Closed status", () => {
    render(
      <ListmonkSyncButton
        eventStatus="Registration Closed"
        listmonkListId={null}
        isStale={false}
      />
    )

    expect(screen.getByRole("button")).toBeInTheDocument()
  })

  it("should render for Completed status", () => {
    render(
      <ListmonkSyncButton
        eventStatus="Completed"
        listmonkListId={null}
        isStale={false}
      />
    )

    expect(screen.getByRole("button")).toBeInTheDocument()
  })

  it("should render for Cancelled status", () => {
    render(
      <ListmonkSyncButton
        eventStatus="Cancelled"
        listmonkListId={null}
        isStale={false}
      />
    )

    expect(screen.getByRole("button")).toBeInTheDocument()
  })

  it("should have correct form intent", async () => {
    render(
      <ListmonkSyncButton
        eventStatus="Registration Open"
        listmonkListId={null}
        isStale={false}
      />
    )

    const intentInput = document.querySelector('input[name="intent"]')
    expect(intentInput).toHaveValue("sync-listmonk-list")
  })
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import type { FetcherWithComponents } from "react-router"
import { ListmonkSyncButton } from "./listmonk-sync-button"
import type { ComposableFetcherData } from "~types/database/entities.types"

function createMockFetcher(
  state: "idle" | "submitting" | "loading" = "idle",
  intent?: string
) {
  const formData = intent ? new FormData() : undefined
  if (formData && intent) {
    formData.set("intent", intent)
  }
  return {
    Form: ({ children, ...props }: { children: React.ReactNode }) => (
      <form {...props}>{children}</form>
    ),
    state,
    data: undefined,
    formData,
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    submit: vi.fn(),
    load: vi.fn(),
  } as unknown as FetcherWithComponents<ComposableFetcherData>
}

describe("ListmonkSyncButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render 'Criar lista da newsletter' when no list exists", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={null}
        isStale={false}
        fetcher={createMockFetcher()}
      />
    )

    expect(screen.getByRole("button", { name: /criar lista da newsletter/i })).toBeInTheDocument()
  })

  it("should render 'Atualizar lista da newsletter' when list exists", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={123}
        isStale={false}
        fetcher={createMockFetcher()}
      />
    )

    expect(screen.getByRole("button", { name: /atualizar lista da newsletter/i })).toBeInTheDocument()
  })

  it("should show warning icon when list is stale", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={123}
        isStale={true}
        fetcher={createMockFetcher()}
      />
    )

    expect(screen.getByTestId("stale-warning")).toBeInTheDocument()
  })

  it("should not show warning icon when list is not stale", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={123}
        isStale={false}
        fetcher={createMockFetcher()}
      />
    )

    expect(screen.queryByTestId("stale-warning")).not.toBeInTheDocument()
  })

  it("should have correct form intent", async () => {
    render(
      <ListmonkSyncButton
        listmonkListId={null}
        isStale={false}
        fetcher={createMockFetcher()}
      />
    )

    const intentInput = document.querySelector('input[name="intent"]')
    expect(intentInput).toHaveValue("sync-listmonk-list")
  })

  it("should show 'Atualizando...' when submitting with existing list", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={123}
        isStale={false}
        fetcher={createMockFetcher("submitting", "sync-listmonk-list")}
      />
    )

    expect(screen.getByRole("button", { name: /atualizando.../i })).toBeInTheDocument()
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("should show 'Criando...' when submitting without existing list", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={null}
        isStale={false}
        fetcher={createMockFetcher("submitting", "sync-listmonk-list")}
      />
    )

    expect(screen.getByRole("button", { name: /criando.../i })).toBeInTheDocument()
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("should not show loading state when fetcher is submitting a different intent", () => {
    render(
      <ListmonkSyncButton
        listmonkListId={123}
        isStale={false}
        fetcher={createMockFetcher("submitting", "update-event-participant")}
      />
    )

    expect(screen.getByRole("button", { name: /atualizar lista da newsletter/i })).toBeInTheDocument()
    expect(screen.getByRole("button")).not.toBeDisabled()
  })
})

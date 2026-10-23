import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SyncVeteransListButton } from "./sync-veterans-list-button"

const fetcher = vi.hoisted(() => ({
  submit: vi.fn(),
  state: "idle",
  data: undefined as
    | {
        intent: string
        result?: { added: number; removed: number; total: number }
        error?: string
      }
    | undefined,
}))

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useFetcher: () => fetcher,
}))

describe("SyncVeteransListButton", () => {
  beforeEach(() => {
    fetcher.submit.mockClear()
    fetcher.state = "idle"
    fetcher.data = undefined
  })

  it("asks the server to sync the veterans list", async () => {
    render(<SyncVeteransListButton />)

    await userEvent.click(
      screen.getByRole("button", { name: "Sincronizar lista de veteranos" }),
    )

    expect(fetcher.submit).toHaveBeenCalledWith(
      { intent: "sync-veterans-list" },
      { method: "POST" },
    )
  })

  it("is disabled while the sync runs", () => {
    fetcher.state = "submitting"

    render(<SyncVeteransListButton />)

    expect(
      screen.getByRole("button", { name: "Sincronizando..." }),
    ).toBeDisabled()
  })

  it("hides the previous result while a new sync runs", () => {
    fetcher.state = "submitting"
    fetcher.data = {
      intent: "sync-veterans-list",
      result: { added: 3, removed: 1, total: 12 },
    }

    render(<SyncVeteransListButton />)

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("hides the previous error while a new sync runs", () => {
    fetcher.state = "submitting"
    fetcher.data = {
      intent: "sync-veterans-list",
      error: "Erro ao sincronizar a lista de veteranos. Tente novamente.",
    }

    render(<SyncVeteransListButton />)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows how many were added, removed and are on the list", () => {
    fetcher.data = {
      intent: "sync-veterans-list",
      result: { added: 3, removed: 1, total: 12 },
    }

    render(<SyncVeteransListButton />)

    expect(screen.getByRole("status")).toHaveTextContent(
      "Lista de veteranos sincronizada: 3 adicionades, 1 removides, 12 na lista",
    )
  })

  it("shows why the sync failed", () => {
    fetcher.data = {
      intent: "sync-veterans-list",
      error: "Erro ao sincronizar a lista de veteranos. Tente novamente.",
    }

    render(<SyncVeteransListButton />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Erro ao sincronizar a lista de veteranos. Tente novamente.",
    )
  })
})

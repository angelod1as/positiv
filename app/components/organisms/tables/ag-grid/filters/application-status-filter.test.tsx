import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"
import type { IRowNode } from "ag-grid-community"

// Mock AG Grid's useGridFilter hook
const mockUseGridFilter = vi.fn()
vi.mock("ag-grid-react", () => ({
  useGridFilter: (callbacks: { doesFilterPass: unknown }) => {
    mockUseGridFilter(callbacks)
  },
}))

import { ApplicationStatusFilter } from "./application-status-filter"

describe("ApplicationStatusFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders all 6 application status options", () => {
      render(<ApplicationStatusFilter />)

      expect(screen.getByText("Pendente")).toBeInTheDocument()
      expect(screen.getByText("Conversando")).toBeInTheDocument()
      expect(screen.getByText("Dados de pagto enviados")).toBeInTheDocument()
      expect(screen.getByText("Regras enviadas")).toBeInTheDocument()
      expect(screen.getByText("Pensar melhor")).toBeInTheDocument()
      expect(screen.getByText("Finalizado")).toBeInTheDocument()
    })

    it("shows selection count", () => {
      render(<ApplicationStatusFilter />)

      expect(screen.getByText("0 de 6 selecionados")).toBeInTheDocument()
    })
  })

  describe("Selection Behavior", () => {
    it("clicking option selects it", async () => {
      const user = userEvent.setup()

      render(<ApplicationStatusFilter />)

      await user.click(screen.getByText("Pendente"))

      expect(screen.getByText("1 de 6 selecionados")).toBeInTheDocument()
    })

    it("selecting multiple options updates count", async () => {
      const user = userEvent.setup()

      render(<ApplicationStatusFilter />)

      await user.click(screen.getByText("Pendente"))
      await user.click(screen.getByText("Finalizado"))

      expect(screen.getByText("2 de 6 selecionados")).toBeInTheDocument()
    })
  })

  describe("Filter Logic (doesFilterPass)", () => {
    it("registers doesFilterPass callback with useGridFilter", () => {
      render(<ApplicationStatusFilter />)

      expect(mockUseGridFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          doesFilterPass: expect.any(Function),
        })
      )
    })

    it("doesFilterPass returns true when no selections (filter inactive)", () => {
      render(<ApplicationStatusFilter />)

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const mockNode = { data: { application_status: "pending" } } as IRowNode

      expect(doesFilterPass({ node: mockNode })).toBe(true)
    })
  })
})

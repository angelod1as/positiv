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

import { BaseMultiSelectFilter } from "./base-multi-select-filter"

const mockOptions = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
]

const mockGetValue = vi.fn((node: IRowNode) => node.data?.status)

const defaultProps = {
  model: null as string[] | null,
  onModelChange: vi.fn(),
  getValue: mockGetValue,
  options: mockOptions,
}

describe("BaseMultiSelectFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders all filter options from props", () => {
      render(<BaseMultiSelectFilter {...defaultProps} />)

      expect(screen.getByText("Pendente")).toBeInTheDocument()
      expect(screen.getByText("Aprovado")).toBeInTheDocument()
      expect(screen.getByText("Rejeitado")).toBeInTheDocument()
    })

    it("shows search input for filtering options", () => {
      render(<BaseMultiSelectFilter {...defaultProps} />)

      expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument()
    })

    it('shows "Selecionar Todos" and "Limpar" buttons', () => {
      render(<BaseMultiSelectFilter {...defaultProps} />)

      expect(
        screen.getByRole("button", { name: /selecionar todos/i })
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /limpar/i })).toBeInTheDocument()
    })

    it('shows selection count: "X de Y selecionados"', () => {
      render(<BaseMultiSelectFilter {...defaultProps} model={["pending"]} />)

      expect(screen.getByText("1 de 3 selecionados")).toBeInTheDocument()
    })

    it("shows zero count when no selections", () => {
      render(<BaseMultiSelectFilter {...defaultProps} model={null} />)

      expect(screen.getByText("0 de 3 selecionados")).toBeInTheDocument()
    })
  })

  describe("Selection Behavior", () => {
    it("clicking option toggles its selection state", async () => {
      const user = userEvent.setup()
      const onModelChange = vi.fn()

      render(
        <BaseMultiSelectFilter
          {...defaultProps}
          model={null}
          onModelChange={onModelChange}
        />
      )

      await user.click(screen.getByText("Pendente"))

      expect(onModelChange).toHaveBeenCalledWith(["pending"])
    })

    it("clicking selected option removes it from selection", async () => {
      const user = userEvent.setup()
      const onModelChange = vi.fn()

      render(
        <BaseMultiSelectFilter
          {...defaultProps}
          model={["pending", "approved"]}
          onModelChange={onModelChange}
        />
      )

      await user.click(screen.getByText("Pendente"))

      expect(onModelChange).toHaveBeenCalledWith(["approved"])
    })

    it('"Selecionar Todos" selects all options', async () => {
      const user = userEvent.setup()
      const onModelChange = vi.fn()

      render(
        <BaseMultiSelectFilter
          {...defaultProps}
          model={null}
          onModelChange={onModelChange}
        />
      )

      await user.click(screen.getByRole("button", { name: /selecionar todos/i }))

      expect(onModelChange).toHaveBeenCalledWith([
        "pending",
        "approved",
        "rejected",
      ])
    })

    it('"Limpar" deselects all options and sets model to null', async () => {
      const user = userEvent.setup()
      const onModelChange = vi.fn()

      render(
        <BaseMultiSelectFilter
          {...defaultProps}
          model={["pending", "approved"]}
          onModelChange={onModelChange}
        />
      )

      await user.click(screen.getByRole("button", { name: /limpar/i }))

      expect(onModelChange).toHaveBeenCalledWith(null)
    })

    it("calls onModelChange with null when last selection is removed", async () => {
      const user = userEvent.setup()
      const onModelChange = vi.fn()

      render(
        <BaseMultiSelectFilter
          {...defaultProps}
          model={["pending"]}
          onModelChange={onModelChange}
        />
      )

      await user.click(screen.getByText("Pendente"))

      expect(onModelChange).toHaveBeenCalledWith(null)
    })
  })

  describe("Search Functionality", () => {
    it("search input filters visible options", async () => {
      const user = userEvent.setup()

      render(<BaseMultiSelectFilter {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText("Buscar...")
      await user.type(searchInput, "Pend")

      expect(screen.getByText("Pendente")).toBeInTheDocument()
      expect(screen.queryByText("Aprovado")).not.toBeInTheDocument()
      expect(screen.queryByText("Rejeitado")).not.toBeInTheDocument()
    })

    it('shows "Nenhum resultado" when search has no matches', async () => {
      const user = userEvent.setup()

      render(<BaseMultiSelectFilter {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText("Buscar...")
      await user.type(searchInput, "xyz123")

      expect(screen.getByText("Nenhum resultado")).toBeInTheDocument()
    })
  })

  describe("Filter Logic (doesFilterPass)", () => {
    it("registers doesFilterPass callback with useGridFilter", () => {
      render(<BaseMultiSelectFilter {...defaultProps} />)

      expect(mockUseGridFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          doesFilterPass: expect.any(Function),
        })
      )
    })

    it("doesFilterPass returns true when no selections (filter inactive)", () => {
      render(<BaseMultiSelectFilter {...defaultProps} model={null} />)

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const mockNode = { data: { status: "pending" } } as IRowNode

      expect(doesFilterPass({ node: mockNode })).toBe(true)
    })

    it("doesFilterPass returns true when cell value matches any selected value", () => {
      render(
        <BaseMultiSelectFilter
          {...defaultProps}
          model={["pending", "approved"]}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const mockNode = { data: { status: "pending" } } as IRowNode
      mockGetValue.mockReturnValueOnce("pending")

      expect(doesFilterPass({ node: mockNode })).toBe(true)
    })

    it("doesFilterPass returns false when cell value doesn't match selection", () => {
      render(<BaseMultiSelectFilter {...defaultProps} model={["approved"]} />)

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const mockNode = { data: { status: "pending" } } as IRowNode
      mockGetValue.mockReturnValueOnce("pending")

      expect(doesFilterPass({ node: mockNode })).toBe(false)
    })

    it("doesFilterPass returns false when cell value is null", () => {
      render(<BaseMultiSelectFilter {...defaultProps} model={["approved"]} />)

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const mockNode = { data: { status: null } } as IRowNode
      mockGetValue.mockReturnValueOnce(null)

      expect(doesFilterPass({ node: mockNode })).toBe(false)
    })

    it("doesFilterPass returns false when cell value is undefined", () => {
      render(<BaseMultiSelectFilter {...defaultProps} model={["approved"]} />)

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const mockNode = { data: {} } as IRowNode
      mockGetValue.mockReturnValueOnce(undefined)

      expect(doesFilterPass({ node: mockNode })).toBe(false)
    })
  })

  describe("Custom Labels", () => {
    it("uses custom placeholder when provided", () => {
      render(
        <BaseMultiSelectFilter {...defaultProps} placeholder="Search items..." />
      )

      expect(screen.getByPlaceholderText("Search items...")).toBeInTheDocument()
    })

    it("uses custom selectAllLabel when provided", () => {
      render(
        <BaseMultiSelectFilter {...defaultProps} selectAllLabel="Select All" />
      )

      expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument()
    })

    it("uses custom clearLabel when provided", () => {
      render(
        <BaseMultiSelectFilter {...defaultProps} clearLabel="Clear All" />
      )

      expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument()
    })

    it("uses custom noResultsLabel when provided", async () => {
      const user = userEvent.setup()

      render(
        <BaseMultiSelectFilter {...defaultProps} noResultsLabel="Nothing found" />
      )

      const searchInput = screen.getByPlaceholderText("Buscar...")
      await user.type(searchInput, "xyz123")

      expect(screen.getByText("Nothing found")).toBeInTheDocument()
    })
  })
})

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

  describe("Field Prop (filterParams mode)", () => {
    it("uses field prop to extract value from row data", () => {
      render(
        <BaseMultiSelectFilter
          options={mockOptions}
          field="status"
          model={["pending"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const matchingNode = { data: { status: "pending" } } as IRowNode
      const nonMatchingNode = { data: { status: "approved" } } as IRowNode

      expect(doesFilterPass({ node: matchingNode })).toBe(true)
      expect(doesFilterPass({ node: nonMatchingNode })).toBe(false)
    })

    it("prefers getValue over field when both provided", () => {
      const customGetValue = vi.fn((node: IRowNode) => node.data?.customField)

      render(
        <BaseMultiSelectFilter
          options={mockOptions}
          field="status"
          getValue={customGetValue}
          model={["pending"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const mockNode = { data: { status: "approved", customField: "pending" } } as IRowNode

      doesFilterPass({ node: mockNode })

      expect(customGetValue).toHaveBeenCalledWith(mockNode)
    })
  })

  describe("Uncontrolled Mode (internal state)", () => {
    it("manages internal state when model/onModelChange not provided", async () => {
      const user = userEvent.setup()

      render(<BaseMultiSelectFilter options={mockOptions} field="status" />)

      expect(screen.getByText("0 de 3 selecionados")).toBeInTheDocument()

      await user.click(screen.getByText("Pendente"))

      expect(screen.getByText("1 de 3 selecionados")).toBeInTheDocument()
    })

    it("doesFilterPass correctly filters nodes when filter is active", async () => {
      const user = userEvent.setup()

      render(<BaseMultiSelectFilter options={mockOptions} field="status" />)

      await user.click(screen.getByText("Pendente"))

      // Get the latest doesFilterPass after state update
      const lastCallIndex = mockUseGridFilter.mock.calls.length - 1
      const { doesFilterPass } = mockUseGridFilter.mock.calls[lastCallIndex][0]

      const matchingNode = { data: { status: "pending" } } as IRowNode
      const nonMatchingNode = { data: { status: "approved" } } as IRowNode

      expect(doesFilterPass({ node: matchingNode })).toBe(true)
      expect(doesFilterPass({ node: nonMatchingNode })).toBe(false)
    })

    it("clears filter with Limpar button in uncontrolled mode", async () => {
      const user = userEvent.setup()

      render(<BaseMultiSelectFilter options={mockOptions} field="status" />)

      await user.click(screen.getByText("Pendente"))
      expect(screen.getByText("1 de 3 selecionados")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: /limpar/i }))
      expect(screen.getByText("0 de 3 selecionados")).toBeInTheDocument()
    })
  })

  describe("Array Matching Mode (matchMode='array')", () => {
    const genderOptions = [
      { value: "homem cis", label: "Homem cis" },
      { value: "mulher cis", label: "Mulher cis" },
      { value: "pessoa não binária", label: "Pessoa não binária" },
    ]

    it("passes when selected value exists in row array", () => {
      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          model={["homem cis"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const matchingNode = {
        data: { gender: ["homem cis", "pessoa não binária"] },
      } as IRowNode

      expect(doesFilterPass({ node: matchingNode })).toBe(true)
    })

    it("fails when selected value not in row array", () => {
      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          model={["mulher cis"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const nonMatchingNode = {
        data: { gender: ["homem cis", "pessoa não binária"] },
      } as IRowNode

      expect(doesFilterPass({ node: nonMatchingNode })).toBe(false)
    })

    it("handles case-insensitive matching", () => {
      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          model={["homem cis"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const mixedCaseNode = {
        data: { gender: ["Homem Cis", "Pessoa Não Binária"] },
      } as IRowNode

      expect(doesFilterPass({ node: mixedCaseNode })).toBe(true)
    })

    it("returns false when row value is not an array", () => {
      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          model={["homem cis"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const nonArrayNode = { data: { gender: "homem cis" } } as IRowNode

      expect(doesFilterPass({ node: nonArrayNode })).toBe(false)
    })

    it("returns true when no selections (filter inactive)", () => {
      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          model={null}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const anyNode = {
        data: { gender: ["homem cis"] },
      } as IRowNode

      expect(doesFilterPass({ node: anyNode })).toBe(true)
    })

    it("matches when ANY selected value exists in row array", () => {
      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          model={["mulher cis", "pessoa não binária"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const partialMatchNode = {
        data: { gender: ["pessoa não binária"] },
      } as IRowNode

      expect(doesFilterPass({ node: partialMatchNode })).toBe(true)
    })

    it("returns false when row array is empty", () => {
      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          model={["homem cis"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const emptyArrayNode = { data: { gender: [] } } as IRowNode

      expect(doesFilterPass({ node: emptyArrayNode })).toBe(false)
    })

    it("returns false when row value is null", () => {
      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          model={["homem cis"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const nullNode = { data: { gender: null } } as IRowNode

      expect(doesFilterPass({ node: nullNode })).toBe(false)
    })

    it("filters out null/undefined values within arrays", () => {
      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          model={["homem cis"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const arrayWithNulls = {
        data: { gender: ["homem cis", null, undefined] },
      } as IRowNode

      expect(doesFilterPass({ node: arrayWithNulls })).toBe(true)
    })

    it("does not match 'null' or 'undefined' strings from null/undefined values", () => {
      render(
        <BaseMultiSelectFilter
          options={[{ value: "null", label: "Null" }]}
          field="gender"
          matchMode="array"
          model={["null"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const arrayWithActualNull = {
        data: { gender: [null, undefined] },
      } as IRowNode

      expect(doesFilterPass({ node: arrayWithActualNull })).toBe(false)
    })
  })

  describe("Exact Matching Mode - Case Sensitivity", () => {
    it("matches case-insensitively in exact mode", () => {
      render(
        <BaseMultiSelectFilter
          options={mockOptions}
          field="status"
          matchMode="exact"
          model={["pending"]}
          onModelChange={vi.fn()}
        />
      )

      const { doesFilterPass } = mockUseGridFilter.mock.calls[0][0]
      const upperCaseNode = { data: { status: "PENDING" } } as IRowNode
      const mixedCaseNode = { data: { status: "Pending" } } as IRowNode

      expect(doesFilterPass({ node: upperCaseNode })).toBe(true)
      expect(doesFilterPass({ node: mixedCaseNode })).toBe(true)
    })
  })

  describe("Filter to Existing Values", () => {
    const createMockApi = (rows: Array<Record<string, unknown>>) => ({
      forEachNode: (callback: (node: IRowNode) => void) => {
        rows.forEach((data) => callback({ data } as IRowNode))
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    it("only shows options that exist in data when filterToExistingValues=true (default)", () => {
      const mockApi = createMockApi([
        { status: "pending" },
        { status: "approved" },
      ])

      render(
        <BaseMultiSelectFilter
          options={mockOptions}
          field="status"
          api={mockApi as never}
          model={null}
          onModelChange={vi.fn()}
        />,
      )

      expect(screen.getByText("Pendente")).toBeInTheDocument()
      expect(screen.getByText("Aprovado")).toBeInTheDocument()
      expect(screen.queryByText("Rejeitado")).not.toBeInTheDocument()
      expect(screen.getByText("0 de 2 selecionados")).toBeInTheDocument()
    })

    it("shows all options when filterToExistingValues=false", () => {
      const mockApi = createMockApi([
        { status: "pending" },
        { status: "approved" },
      ])

      render(
        <BaseMultiSelectFilter
          options={mockOptions}
          field="status"
          api={mockApi as never}
          filterToExistingValues={false}
          model={null}
          onModelChange={vi.fn()}
        />,
      )

      expect(screen.getByText("Pendente")).toBeInTheDocument()
      expect(screen.getByText("Aprovado")).toBeInTheDocument()
      expect(screen.getByText("Rejeitado")).toBeInTheDocument()
      expect(screen.getByText("0 de 3 selecionados")).toBeInTheDocument()
    })

    it("shows all options when api is not provided", () => {
      render(
        <BaseMultiSelectFilter
          options={mockOptions}
          field="status"
          model={null}
          onModelChange={vi.fn()}
        />,
      )

      expect(screen.getByText("Pendente")).toBeInTheDocument()
      expect(screen.getByText("Aprovado")).toBeInTheDocument()
      expect(screen.getByText("Rejeitado")).toBeInTheDocument()
    })

    it("handles case-insensitive matching for existing values", () => {
      const mockApi = createMockApi([
        { status: "PENDING" },
        { status: "Approved" },
      ])

      render(
        <BaseMultiSelectFilter
          options={mockOptions}
          field="status"
          api={mockApi as never}
          model={null}
          onModelChange={vi.fn()}
        />,
      )

      expect(screen.getByText("Pendente")).toBeInTheDocument()
      expect(screen.getByText("Aprovado")).toBeInTheDocument()
      expect(screen.queryByText("Rejeitado")).not.toBeInTheDocument()
    })

    it("handles array matchMode for existing values", () => {
      const genderOptions = [
        { value: "homem cis", label: "Homem cis" },
        { value: "mulher cis", label: "Mulher cis" },
        { value: "pessoa não binária", label: "Pessoa não binária" },
      ]

      const mockApi = createMockApi([
        { gender: ["homem cis", "pessoa não binária"] },
        { gender: ["mulher cis"] },
      ])

      render(
        <BaseMultiSelectFilter
          options={genderOptions}
          field="gender"
          matchMode="array"
          api={mockApi as never}
          model={null}
          onModelChange={vi.fn()}
        />,
      )

      expect(screen.getByText("Homem cis")).toBeInTheDocument()
      expect(screen.getByText("Mulher cis")).toBeInTheDocument()
      expect(screen.getByText("Pessoa não binária")).toBeInTheDocument()
    })

    it("select all only selects filtered options", async () => {
      const user = userEvent.setup()
      const onModelChange = vi.fn()
      const mockApi = createMockApi([
        { status: "pending" },
        { status: "approved" },
      ])

      render(
        <BaseMultiSelectFilter
          options={mockOptions}
          field="status"
          api={mockApi as never}
          model={null}
          onModelChange={onModelChange}
        />,
      )

      await user.click(screen.getByRole("button", { name: /selecionar todos/i }))

      expect(onModelChange).toHaveBeenCalledWith(["pending", "approved"])
    })

    it("uses custom getValue function for filtering existing values", () => {
      const customGetValue = vi.fn((node: IRowNode) => {
        const notes = node.data?.notes as string | null
        return notes && notes.trim() ? "has-notes" : "no-notes"
      })

      const notesOptions = [
        { value: "has-notes", label: "Com notas" },
        { value: "no-notes", label: "Sem notas" },
      ]

      const mockApi = createMockApi([
        { notes: "Some notes" },
        { notes: "More notes" },
        { notes: "" },
      ])

      render(
        <BaseMultiSelectFilter
          options={notesOptions}
          getValue={customGetValue}
          api={mockApi as never}
          model={null}
          onModelChange={vi.fn()}
        />,
      )

      expect(screen.getByText("Com notas")).toBeInTheDocument()
      expect(screen.getByText("Sem notas")).toBeInTheDocument()
    })
  })
})

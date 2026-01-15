import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "~/test/test-utils"
import { AGDataTable } from "./ag-data-table"

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      const { [key]: _, ...rest } = store
      store = rest
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
})

describe("AGDataTable", () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  const mockData = [
    { id: "1", name: "Item 1", value: 100 },
    { id: "2", name: "Item 2", value: 200 },
  ]

  const mockColumnDefs = [
    { field: "name" as const, headerName: "Name" },
    { field: "value" as const, headerName: "Value" },
  ]

  describe("Basic Rendering", () => {
    it("should render the AG Grid component", () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      const grid = screen.getByRole("grid")
      expect(grid).toBeInTheDocument()
    })

    it("should display row data in the grid", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })
      expect(screen.getByText("Item 2")).toBeInTheDocument()
    })

    it("should include id in data-testid attribute", () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      expect(screen.getByTestId("ag-data-table-test-table")).toBeInTheDocument()
    })
  })

  describe("Loading State", () => {
    it("should not show loading overlay by default", async () => {
      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const loadingOverlay = container.querySelector(
        ".ag-overlay-loading-center",
      )
      expect(loadingOverlay).not.toBeInTheDocument()
    })

    it("should show loading overlay when loading is true", async () => {
      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          loading={true}
        />,
      )

      await waitFor(() => {
        const loadingOverlay = container.querySelector(
          ".ag-overlay-loading-center",
        )
        expect(loadingOverlay).toBeInTheDocument()
      })
    })
  })

  describe("Empty State", () => {
    type DataItem = { id: string; name: string; value: number }

    it("should show default empty message when data is empty", async () => {
      render(
        <AGDataTable<DataItem>
          id="test-table"
          data={[]}
          columnDefs={mockColumnDefs}
        />,
      )

      await waitFor(() => {
        expect(
          screen.getByText("Nenhum registro encontrado"),
        ).toBeInTheDocument()
      })
    })

    it("should show custom empty message when provided", async () => {
      render(
        <AGDataTable<DataItem>
          id="test-table"
          data={[]}
          columnDefs={mockColumnDefs}
          emptyMessage="Sem dados disponíveis"
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Sem dados disponíveis")).toBeInTheDocument()
      })
    })

    it("should escape HTML in custom empty message to prevent XSS", async () => {
      const { container } = render(
        <AGDataTable<DataItem>
          id="test-table"
          data={[]}
          columnDefs={mockColumnDefs}
          emptyMessage="<script>alert('xss')</script>"
        />,
      )

      await waitFor(() => {
        const overlay = container.querySelector(".ag-overlay")
        expect(overlay).toBeInTheDocument()
      })

      const scriptElements = container.querySelectorAll("script")
      expect(scriptElements).toHaveLength(0)

      expect(container.innerHTML).toContain("&lt;script&gt;")
    })
  })

  describe("Row Selection", () => {
    it("should not show checkboxes when rowSelection is not set", async () => {
      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const checkboxes = container.querySelectorAll(".ag-checkbox-input")
      expect(checkboxes).toHaveLength(0)
    })

    it("should enable single row selection when rowSelection is single", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          rowSelection="single"
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      expect(screen.getByRole("grid")).toBeInTheDocument()
    })

    it("should show row checkboxes when rowSelection is multiple", async () => {
      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          rowSelection="multiple"
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const checkboxes = container.querySelectorAll(".ag-checkbox-input")
      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it("should call onRowSelectionChange when row is selected", async () => {
      const user = userEvent.setup()
      const handleSelectionChange = vi.fn()

      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          rowSelection="multiple"
          onRowSelectionChange={handleSelectionChange}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const firstRowCheckbox = container.querySelector(
        ".ag-row:first-child .ag-checkbox-input",
      ) as HTMLElement
      expect(firstRowCheckbox).toBeInTheDocument()

      await user.click(firstRowCheckbox)

      await waitFor(() => {
        expect(handleSelectionChange).toHaveBeenCalled()
      })

      const lastCallArgs = handleSelectionChange.mock.calls.at(-1)?.[0]
      expect(lastCallArgs).toHaveLength(1)
      expect(lastCallArgs[0]).toMatchObject({ id: "1", name: "Item 1" })
    })
  })

  describe("Grid Ready and Cell Value Changed", () => {
    it("should call onGridReady when grid is ready", async () => {
      const handleGridReady = vi.fn()

      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          onGridReady={handleGridReady}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      expect(handleGridReady).toHaveBeenCalled()
      expect(handleGridReady.mock.calls[0][0]).toHaveProperty("api")
    })

    it("should accept onCellValueChanged prop", () => {
      const handleCellValueChanged = vi.fn()

      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          onCellValueChanged={handleCellValueChanged}
        />,
      )

      expect(container.querySelector(".ag-root-wrapper")).toBeInTheDocument()
    })
  })

  describe("Styling Props", () => {
    it("should apply custom height when provided", async () => {
      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          height="600px"
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const gridContainer = container.querySelector(
        '[data-testid="ag-data-table-test-table"]',
      )
      expect(gridContainer).toHaveStyle({ height: "600px" })
    })

    it("should use default height when not provided", async () => {
      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const gridContainer = container.querySelector(
        '[data-testid="ag-data-table-test-table"]',
      )
      expect(gridContainer).toHaveStyle({ height: "515px" })
    })

    it("should merge custom className with default classes", async () => {
      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          className="custom-class"
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const gridContainer = container.querySelector(
        '[data-testid="ag-data-table-test-table"]',
      )
      expect(gridContainer).toHaveClass("custom-class")
    })
  })

  describe("Column Features", () => {
    it("should make columns sortable by default", async () => {
      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const headerCells = container.querySelectorAll(".ag-header-cell")
      const firstHeaderCell = headerCells[0]
      expect(firstHeaderCell).toHaveClass("ag-header-cell-sortable")
    })

    it("should make columns resizable by default", async () => {
      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const resizeHandles = container.querySelectorAll(".ag-header-cell-resize")
      expect(resizeHandles.length).toBeGreaterThan(0)
    })
  })

  describe("Quick Filter", () => {
    it("should filter rows based on quickFilterText", async () => {
      const { rerender } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })
      expect(screen.getByText("Item 2")).toBeInTheDocument()

      rerender(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          quickFilterText="Item 1"
        />,
      )

      await waitFor(() => {
        expect(screen.queryByText("Item 2")).not.toBeInTheDocument()
      })

      expect(screen.getByText("Item 1")).toBeInTheDocument()
    })
  })

  describe("Pagination", () => {
    const manyRows = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
      value: i * 100,
    }))

    it("should render data when pagination is disabled", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={manyRows}
          columnDefs={mockColumnDefs}
          pagination={false}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 0")).toBeInTheDocument()
      })
    })

    it("should render data when pagination is enabled", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={manyRows}
          columnDefs={mockColumnDefs}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 30]}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 0")).toBeInTheDocument()
      })
    })

    it("should render data when paginationAutoPageSize is enabled", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={manyRows}
          columnDefs={mockColumnDefs}
          pagination={true}
          paginationAutoPageSize={true}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 0")).toBeInTheDocument()
      })
    })
  })

  describe("State Persistence", () => {
    it("should accept persistState and stateVersion props", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          persistState={true}
          stateVersion={2}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      expect(screen.getByTestId("ag-data-table-test-table")).toBeInTheDocument()
    })

    it("should call onStateUpdated callback when state changes", async () => {
      const user = userEvent.setup()
      const handleStateUpdated = vi.fn()

      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          onStateUpdated={handleStateUpdated}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      // Click on the Name header to trigger a sort (state change)
      const nameHeader = container.querySelector(
        '.ag-header-cell[col-id="name"]',
      ) as HTMLElement
      expect(nameHeader).toBeInTheDocument()

      await user.click(nameHeader)

      await waitFor(() => {
        expect(handleStateUpdated).toHaveBeenCalled()
      })
    })

    it("should still call onGridReady when persistState is enabled", async () => {
      const handleGridReady = vi.fn()

      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          persistState={true}
          stateVersion={1}
          onGridReady={handleGridReady}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      expect(handleGridReady).toHaveBeenCalled()
      expect(handleGridReady.mock.calls[0][0]).toHaveProperty("api")
    })

    it("should render correctly with default stateVersion when not provided", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          persistState={true}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      expect(screen.getByTestId("ag-data-table-test-table")).toBeInTheDocument()
    })

    it("should not apply flex when saved state exists to respect saved widths", async () => {
      const savedState = {
        version: 1,
        savedAt: Date.now(),
        gridState: {
          columnSizing: {
            columnSizingModel: [
              { colId: "name", width: 250 },
              { colId: "value", width: 150 },
            ],
          },
        },
      }
      mockLocalStorage.setItem(
        "ag-grid-state-test-table",
        JSON.stringify(savedState),
      )

      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          persistState={true}
          stateVersion={1}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const nameColumn = container.querySelector(
        '.ag-header-cell[col-id="name"]',
      )
      expect(nameColumn).toBeInTheDocument()
      expect(nameColumn).not.toHaveStyle({ flex: "1" })
    })
  })

  describe("Toolbar", () => {
    it("should render toolbar by default", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      expect(
        screen.getByRole("button", { name: /limpar filtros/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /resetar tabela/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /tela cheia/i }),
      ).toBeInTheDocument()
    })

    it("should not render toolbar when showToolbar is false", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          showToolbar={false}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      expect(
        screen.queryByRole("button", { name: /limpar filtros/i }),
      ).not.toBeInTheDocument()
    })

    it("should render toolbar when showToolbar is explicitly true", async () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          showToolbar={true}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      expect(
        screen.getByRole("button", { name: /limpar filtros/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /resetar tabela/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /tela cheia/i }),
      ).toBeInTheDocument()
    })

    it("should toggle fullscreen mode when fullscreen button is clicked", async () => {
      const user = userEvent.setup()

      const { container } = render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          showToolbar
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      const tableContainer = container.querySelector(
        '[data-testid="ag-data-table-test-table"]',
      )
      expect(tableContainer).not.toHaveClass("fixed")

      await user.click(screen.getByRole("button", { name: /tela cheia/i }))

      expect(tableContainer).toHaveClass("fixed")
      expect(
        screen.getByRole("button", { name: /minimizar/i }),
      ).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: /minimizar/i }))

      expect(tableContainer).not.toHaveClass("fixed")
    })

    it("should call onClearFilters when clear filters button is clicked", async () => {
      const user = userEvent.setup()
      const handleClearFilters = vi.fn()

      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          showToolbar
          onClearFilters={handleClearFilters}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      await user.click(screen.getByRole("button", { name: /limpar filtros/i }))

      expect(handleClearFilters).toHaveBeenCalled()
    })

    it("should call onClearFilters when reset table button is clicked", async () => {
      const user = userEvent.setup()
      const handleClearFilters = vi.fn()

      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
          showToolbar
          onClearFilters={handleClearFilters}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument()
      })

      await user.click(screen.getByRole("button", { name: /resetar tabela/i }))

      expect(handleClearFilters).toHaveBeenCalled()
    })
  })
})

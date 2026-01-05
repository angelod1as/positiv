import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AGDataTable } from "./ag-data-table"

describe("AGDataTable", () => {
  const mockData = [
    { id: "1", name: "Item 1", value: 100 },
    { id: "2", name: "Item 2", value: 200 },
  ]

  const mockColumnDefs = [
    { field: "name" as const, headerName: "Name" },
    { field: "value" as const, headerName: "Value" },
  ]

  describe("Basic Rendering", () => {
    it("should render with ag-theme-quartz class", () => {
      render(
        <AGDataTable
          id="test-table"
          data={mockData}
          columnDefs={mockColumnDefs}
        />,
      )

      const gridContainer = screen
        .getByRole("grid")
        .closest(".ag-theme-quartz")
      expect(gridContainer).toBeInTheDocument()
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

      const loadingOverlay = container.querySelector(".ag-overlay-loading-center")
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
    it("should show default empty message when data is empty", async () => {
      render(
        <AGDataTable id="test-table" data={[]} columnDefs={mockColumnDefs} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument()
      })
    })

    it("should show custom empty message when provided", async () => {
      render(
        <AGDataTable
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
  })
})

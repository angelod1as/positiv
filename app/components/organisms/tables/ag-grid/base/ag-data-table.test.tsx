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
})

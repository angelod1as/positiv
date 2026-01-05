import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BaseAgGrid } from "./base-ag-grid"

describe("BaseAgGrid", () => {
  const mockRowData = [
    { id: "1", name: "Item 1", value: 100 },
    { id: "2", name: "Item 2", value: 200 },
  ]

  const mockColumnDefs = [
    { field: "name", headerName: "Name" },
    { field: "value", headerName: "Value" },
  ]

  it("should render with ag-theme-quartz class", () => {
    render(
      <BaseAgGrid rowData={mockRowData} columnDefs={mockColumnDefs} />,
    )

    const gridContainer = screen.getByRole("treegrid").closest(".ag-theme-quartz")
    expect(gridContainer).toBeInTheDocument()
  })

  it("should display row data in the grid", () => {
    render(
      <BaseAgGrid rowData={mockRowData} columnDefs={mockColumnDefs} />,
    )

    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })

  it("should render column headers from columnDefs", () => {
    render(
      <BaseAgGrid rowData={mockRowData} columnDefs={mockColumnDefs} />,
    )

    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Value")).toBeInTheDocument()
  })

  it("should accept custom className prop", () => {
    render(
      <BaseAgGrid
        rowData={mockRowData}
        columnDefs={mockColumnDefs}
        className="custom-class"
      />,
    )

    const gridContainer = screen.getByRole("treegrid").closest(".custom-class")
    expect(gridContainer).toBeInTheDocument()
  })
})

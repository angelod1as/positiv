import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Column } from "primereact/column"
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "./data-table"

describe("DataTable - Row Click Functionality", () => {
  it("should call onRowClick handler when a row is clicked", async () => {
    const user = userEvent.setup()
    const mockOnRowClick = vi.fn()
    const mockData = [
      { id: "1", name: "Test Item 1" },
      { id: "2", name: "Test Item 2" },
    ]

    render(
      <DataTable
        data={mockData}
        id="test-table"
        onRowClick={mockOnRowClick}
      >
        <Column field="name" header="Name" />
      </DataTable>,
    )

    const firstRow = screen.getByText("Test Item 1").closest("tr")
    expect(firstRow).toBeInTheDocument()

    await user.click(firstRow!)

    expect(mockOnRowClick).toHaveBeenCalledTimes(1)
    expect(mockOnRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ data: mockData[0] }),
    )
  })

  it("should render table without onRowClick prop", () => {
    const mockData = [{ id: "1", name: "Test" }]

    render(
      <DataTable data={mockData} id="test-table">
        <Column field="name" header="Name" />
      </DataTable>,
    )

    expect(screen.getByText("Test")).toBeInTheDocument()
  })
})

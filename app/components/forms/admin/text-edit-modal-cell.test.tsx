import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TextEditModalCell } from "./text-edit-modal-cell"

type TestRow = {
  id: string
  notes: string
}

describe("TextEditModalCell", () => {
  it("should always show pencil icon for editing", () => {
    const shortText = "Short notes"
    const mockSave = vi.fn()
    const rowData: TestRow = { id: "1", notes: shortText }

    render(
      <TextEditModalCell
        value={shortText}
        rowData={rowData}
        field="notes"
        onSave={mockSave}
      />,
    )

    expect(screen.getByText(shortText)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
  })

  it("should display truncated text with pencil icon for long text", () => {
    const longText =
      "This is a very long text that definitely exceeds the limit for inline editing"
    const mockSave = vi.fn()
    const rowData: TestRow = { id: "1", notes: longText }

    render(
      <TextEditModalCell
        value={longText}
        rowData={rowData}
        field="notes"
        onSave={mockSave}
      />,
    )

    expect(screen.getByText(/This is a very long text.../)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
  })

  it("should open dialog with textarea when pencil icon is clicked", async () => {
    const user = userEvent.setup()
    const longText =
      "This is a very long text that definitely exceeds the limit"
    const mockSave = vi.fn()
    const rowData: TestRow = { id: "1", notes: longText }

    render(
      <TextEditModalCell
        value={longText}
        rowData={rowData}
        field="notes"
        onSave={mockSave}
      />,
    )

    await user.click(screen.getByRole("button", { name: /edit/i }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    const textarea = screen.getByRole("textbox")
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue(longText)
  })

  it("should save changes when save button is clicked", async () => {
    const user = userEvent.setup()
    const longText =
      "This is a very long text that definitely exceeds the limit"
    const mockSave = vi.fn()
    const rowData: TestRow = { id: "1", notes: longText }

    render(
      <TextEditModalCell
        value={longText}
        rowData={rowData}
        field="notes"
        onSave={mockSave}
      />,
    )

    await user.click(screen.getByRole("button", { name: /edit/i }))
    const textarea = screen.getByRole("textbox")
    await user.clear(textarea)
    await user.type(textarea, "Updated text content")

    await user.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith("1", "notes", "Updated text content")
    })
  })

  it("should NOT save changes when cancel button is clicked", async () => {
    const user = userEvent.setup()
    const longText =
      "This is a very long text that definitely exceeds the limit"
    const mockSave = vi.fn()
    const rowData: TestRow = { id: "1", notes: longText }

    render(
      <TextEditModalCell
        value={longText}
        rowData={rowData}
        field="notes"
        onSave={mockSave}
      />,
    )

    await user.click(screen.getByRole("button", { name: /edit/i }))
    const textarea = screen.getByRole("textbox")
    await user.clear(textarea)
    await user.type(textarea, "Updated text that should be discarded")

    await user.click(screen.getByRole("button", { name: /cancel/i }))

    expect(mockSave).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("should NOT save changes when Escape key is pressed", async () => {
    const user = userEvent.setup()
    const longText =
      "This is a very long text that definitely exceeds the limit"
    const mockSave = vi.fn()
    const rowData: TestRow = { id: "1", notes: longText }

    render(
      <TextEditModalCell
        value={longText}
        rowData={rowData}
        field="notes"
        onSave={mockSave}
      />,
    )

    await user.click(screen.getByRole("button", { name: /edit/i }))
    const textarea = screen.getByRole("textbox")
    await user.clear(textarea)
    await user.type(textarea, "Updated text that should be discarded")

    await user.keyboard("{Escape}")

    expect(mockSave).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("should handle empty values gracefully", () => {
    const mockSave = vi.fn()
    const rowData: TestRow = { id: "1", notes: "" }

    render(
      <TextEditModalCell
        value=""
        rowData={rowData}
        field="notes"
        onSave={mockSave}
      />,
    )

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
  })

  it("should display optional label in dialog header", async () => {
    const user = userEvent.setup()
    const longText =
      "This is a very long text that definitely exceeds the limit"
    const mockSave = vi.fn()
    const rowData: TestRow = { id: "1", notes: longText }
    const label = "Admin Notes"

    render(
      <TextEditModalCell
        value={longText}
        rowData={rowData}
        field="notes"
        onSave={mockSave}
        label={label}
      />,
    )

    await user.click(screen.getByRole("button", { name: /edit/i }))

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("should display tooltip on hover", async () => {
    const user = userEvent.setup()
    const text = "This text should appear in tooltip"
    const mockSave = vi.fn()
    const rowData: TestRow = { id: "1", notes: text }

    render(
      <TextEditModalCell
        value={text}
        rowData={rowData}
        field="notes"
        onSave={mockSave}
      />,
    )

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.hover(editButton)

    await waitFor(() => {
      const tooltips = screen.getAllByText(text)
      expect(tooltips.length).toBeGreaterThan(0)
    })
  })
})

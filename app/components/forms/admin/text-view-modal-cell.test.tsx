import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { TextViewModalCell } from "./text-view-modal-cell"

describe("TextViewModalCell", () => {
  it("should display short text inline without truncation", () => {
    const shortText = "Short text"
    render(<TextViewModalCell value={shortText} />)

    expect(screen.getByText(shortText)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("should display truncated text with eye icon when text exceeds 25 characters", () => {
    const longText =
      "This is a very long text that definitely exceeds the limit"
    render(<TextViewModalCell value={longText} />)

    expect(screen.getByText(/This is a very long text.../)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument()
  })

  it("should display exactly 25 characters without icon", () => {
    const exactText = "1234567890123456789012345"
    render(<TextViewModalCell value={exactText} />)

    expect(screen.getByText(exactText)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("should open dialog when eye icon is clicked", async () => {
    const user = userEvent.setup()
    const longText =
      "This is a very long text that definitely exceeds the limit"
    render(<TextViewModalCell value={longText} />)

    const viewButton = screen.getByRole("button", { name: /view/i })
    await user.click(viewButton)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(longText)).toBeInTheDocument()
  })

  it("should close dialog when close button is clicked", async () => {
    const user = userEvent.setup()
    const longText =
      "This is a very long text that definitely exceeds the limit"
    render(<TextViewModalCell value={longText} />)

    await user.click(screen.getByRole("button", { name: /view/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /close/i }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("should handle null or undefined values gracefully", () => {
    const { container, rerender } = render(<TextViewModalCell value={null} />)
    const div = container.querySelector("div")
    expect(div).toBeInTheDocument()
    expect(div?.textContent).toBe("")

    rerender(<TextViewModalCell value={undefined} />)
    const updatedDiv = container.querySelector("div")
    expect(updatedDiv).toBeInTheDocument()
    expect(updatedDiv?.textContent).toBe("")
  })

  it("should display optional label in dialog header", async () => {
    const user = userEvent.setup()
    const longText =
      "This is a very long text that definitely exceeds the limit"
    const label = "Companions List"

    render(<TextViewModalCell value={longText} label={label} />)

    await user.click(screen.getByRole("button", { name: /view/i }))

    expect(screen.getByText(label)).toBeInTheDocument()
  })
})

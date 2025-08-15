import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SegmentSelector } from "./segment-selector"

describe("SegmentSelector", () => {
  it("should render segment dropdown", async () => {
    const onChange = vi.fn()
    render(<SegmentSelector value={{}} onChange={onChange} />)
    
    const dropdown = screen.getByLabelText(/audience segment/i)
    expect(dropdown).toBeInTheDocument()
  })
  
  it("should render exclude rejected checkbox", () => {
    const onChange = vi.fn()
    render(<SegmentSelector value={{}} onChange={onChange} />)
    
    const checkbox = screen.getByRole("checkbox", { name: /exclude rejected participants/i })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toBeChecked() // Should be checked by default
  })
  
  it("should show recipient count when provided", () => {
    const onChange = vi.fn()
    render(<SegmentSelector value={{}} onChange={onChange} recipientCount={42} />)
    
    expect(screen.getByText(/42 recipients/i)).toBeInTheDocument()
  })
  
  it("should show loading state for recipient count", () => {
    const onChange = vi.fn()
    render(<SegmentSelector value={{}} onChange={onChange} recipientCount={undefined} isLoadingCount={true} />)
    
    expect(screen.getByText("Calculating...")).toBeInTheDocument()
  })
  
  it("should show recipient preview when provided", () => {
    const onChange = vi.fn()
    const preview = [
      { id: "1", email: "user1@test.com", full_name: "User One" },
      { id: "2", email: "user2@test.com", full_name: "User Two" },
    ]
    
    render(<SegmentSelector value={{}} onChange={onChange} recipientPreview={preview} />)
    
    expect(screen.getByText(/preview/i)).toBeInTheDocument()
    expect(screen.getByText("User One")).toBeInTheDocument()
    expect(screen.getByText("user1@test.com")).toBeInTheDocument()
    expect(screen.getByText("User Two")).toBeInTheDocument()
    expect(screen.getByText("user2@test.com")).toBeInTheDocument()
  })
  
  it("should display selected segment value", () => {
    const onChange = vi.fn()
    render(<SegmentSelector value={{ veteransOnly: true }} onChange={onChange} />)
    
    // The component should show the current selection
    const trigger = screen.getByRole("combobox")
    expect(trigger).toBeInTheDocument()
  })
  
  it("should handle exclude rejected checkbox interaction", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    
    render(<SegmentSelector value={{ excludeRejected: true }} onChange={onChange} />)
    
    const checkbox = screen.getByRole("checkbox", { name: /exclude rejected participants/i })
    await user.click(checkbox)
    
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      excludeRejected: false,
    }))
  })
})
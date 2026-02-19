import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import { MultipleSelect } from "./multiple-select"

function TestMultipleSelect({
  answers = ["Option A", "Option B", "Option C"],
  error,
  defaultValue = [],
}: {
  answers?: string[]
  error?: string
  defaultValue?: string[]
}) {
  const { control } = useForm({
    defaultValues: { testField: defaultValue },
  })
  return (
    <MultipleSelect
      name="testField"
      control={control}
      answers={answers}
      error={error}
    />
  )
}

describe("MultipleSelect", () => {
  it("should render all options", () => {
    render(<TestMultipleSelect />)

    expect(screen.getByText("Option A")).toBeInTheDocument()
    expect(screen.getByText("Option B")).toBeInTheDocument()
    expect(screen.getByText("Option C")).toBeInTheDocument()
  })

  it("should wrap each checkbox inside a label element", () => {
    render(<TestMultipleSelect />)

    const checkboxes = screen.getAllByRole("checkbox")
    for (const checkbox of checkboxes) {
      expect(checkbox.closest("label")).not.toBeNull()
    }
  })

  it("should toggle checkbox when clicking the visual checkbox element", async () => {
    const user = userEvent.setup()
    render(<TestMultipleSelect />)

    const checkboxVisuals = screen.getAllByTestId("checkbox")
    await user.click(checkboxVisuals[0])

    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes[0]).toBeChecked()
  })

  it("should toggle checkbox when clicking the label text", async () => {
    const user = userEvent.setup()
    render(<TestMultipleSelect />)

    await user.click(screen.getByText("Option B"))

    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes[1]).toBeChecked()
  })

  it("should display error when provided", () => {
    render(<TestMultipleSelect error="This field is required" />)

    expect(screen.getByText("This field is required")).toBeInTheDocument()
  })

  it("should render with pre-selected values", () => {
    render(<TestMultipleSelect defaultValue={["Option A", "Option C"]} />)

    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
    expect(checkboxes[2]).toBeChecked()
  })
})

import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { SingleSelect } from "./single-select"

function TestSingleSelect({
  answers = ["Option A", "Option B", "Option C"],
  error,
  defaultValue = "",
}: {
  answers?: string[]
  error?: string
  defaultValue?: string
}) {
  const { control } = useForm({
    defaultValues: { testField: defaultValue },
  })
  return (
    <SingleSelect
      name="testField"
      control={control}
      answers={answers}
      error={error}
    />
  )
}

describe("SingleSelect", () => {
  it("should render all radio options", () => {
    render(<TestSingleSelect />)

    expect(screen.getByText("Option A")).toBeInTheDocument()
    expect(screen.getByText("Option B")).toBeInTheDocument()
    expect(screen.getByText("Option C")).toBeInTheDocument()
  })

  it("should wrap each radio inside a label element", () => {
    render(<TestSingleSelect />)

    const radios = screen.getAllByRole("radio")
    for (const radio of radios) {
      expect(radio.closest("label")).not.toBeNull()
    }
  })

  it("should select radio when clicking the label text", async () => {
    const user = userEvent.setup()
    render(<TestSingleSelect />)

    await user.click(screen.getByText("Option B"))

    const radios = screen.getAllByRole("radio")
    expect(radios[1]).toBeChecked()
  })

  it("should display error when provided", () => {
    render(<TestSingleSelect error="Please select an option" />)

    expect(screen.getByText("Please select an option")).toBeInTheDocument()
  })

  it("should render with pre-selected value", () => {
    render(<TestSingleSelect defaultValue="Option A" />)

    const radios = screen.getAllByRole("radio")
    expect(radios[0]).toBeChecked()
    expect(radios[1]).not.toBeChecked()
  })
})

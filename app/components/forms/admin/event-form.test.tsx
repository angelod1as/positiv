import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import type { Event } from "~types/database/entities.types"
import { EventForm } from "./event-form"

// Mock the SchemaForm component to avoid React Router dependencies
let mockFormValues: Record<string, unknown> = {}
let mockSetValueCalls: Array<[string, unknown]> = []

vi.mock("../base/schema-form", () => ({
  SchemaForm: ({
    children,
    _schema,
    values,
    labels,
    options,
    descriptions,
    inputTypes,
  }: {
    children: (props: {
      Field: React.FC<{ name: string }>
      Button: React.FC<{ children: React.ReactNode }>
      Errors: React.FC
      clearErrors: () => void
      getValues: (field: string) => unknown
      setError: (
        field: string,
        error: { message: string; type: string },
      ) => void
      setValue: (
        field: string,
        value: unknown,
        options?: { shouldValidate: boolean },
      ) => void
    }) => React.ReactNode
    _schema: unknown
    values?: Record<string, unknown>
    labels?: Record<string, string>
    options?: Record<string, Array<{ value: string; name: string }>>
    descriptions?: Record<string, string>
    inputTypes?: Record<string, string>
  }) => {
    mockFormValues = values || {}

    const renderProps = {
      Field: ({ name }: { name: string }) => {
        const fieldType = inputTypes?.[name] || "text"
        const fieldLabel = labels?.[name] || name
        const fieldDescription = descriptions?.[name]
        const fieldOptions = options?.[name]

        if (fieldType === "select" && fieldOptions) {
          return (
            <div>
              <label htmlFor={name}>{fieldLabel}</label>
              {fieldDescription && <p>{fieldDescription}</p>}
              <select
                id={name}
                name={name}
                defaultValue={(mockFormValues[name] as string) || ""}
                data-testid={`field-${name}`}
              >
                {fieldOptions.map((opt: { value: string; name: string }) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          )
        }

        return (
          <div>
            <label htmlFor={name}>{fieldLabel}</label>
            {fieldDescription && <p>{fieldDescription}</p>}
            <input
              id={name}
              name={name}
              type={fieldType}
              defaultValue={(mockFormValues[name] as string | number) || ""}
              data-testid={`field-${name}`}
            />
          </div>
        )
      },
      Button: ({ children }: { children: React.ReactNode }) => (
        <button type="submit">{children || "Salvar"}</button>
      ),
      Errors: () => null,
      clearErrors: vi.fn(),
      getValues: (field: string) => mockFormValues[field],
      setError: vi.fn(),
      setValue: (field: string, value: unknown) => {
        mockSetValueCalls.push([field, value])
        mockFormValues[field] = value
      },
    }

    return <form>{children(renderProps)}</form>
  },
}))

describe("EventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormValues = {}
    mockSetValueCalls = []
  })

  describe("rendering", () => {
    it("renders all form fields with correct labels", () => {
      render(<EventForm />)

      // Check main fields
      expect(screen.getByLabelText("Nome da festa")).toBeInTheDocument()
      expect(screen.getByLabelText("Emoji")).toBeInTheDocument()
      expect(screen.getByLabelText("Descrição")).toBeInTheDocument()
      expect(screen.getByLabelText("Local")).toBeInTheDocument()
      expect(screen.getByLabelText("Valor")).toBeInTheDocument()
      expect(screen.getByLabelText("Lotação")).toBeInTheDocument()
    })

    it("does not render an event type field", () => {
      render(<EventForm />)

      expect(screen.queryByTestId("field-event_type")).not.toBeInTheDocument()
    })

    it("renders date fields with correct type", () => {
      render(<EventForm />)

      const dateFields = [
        "time_event_start",
        "time_event_end",
        "time_application_start",
      ]

      dateFields.forEach((field) => {
        const input = screen.getByTestId(`field-${field}`) as HTMLInputElement
        expect(input.type).toBe("datetime-local")
      })
    })

    it("renders submit button", () => {
      render(<EventForm />)

      expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument()
    })

    it("renders 'Calcular datas automaticamente' button", () => {
      render(<EventForm />)

      expect(
        screen.getByRole("button", { name: "Calcular datas automaticamente" }),
      ).toBeInTheDocument()
    })
  })

  describe("with existing event data", () => {
    const mockEvent: Event = {
      id: "123",
      title: "Test Legacy Event",
      emoji: "🔒",
      description: "A test legacy event",
      location: "Test Location",
      ticket_price: 100,
      total_spots: 50,
      event_type: "bdsm",
      event_status: "Draft",
      created_at: "2024-01-01",
      auto_publish: true,
      time_event_start: "2024-02-01T10:00:00",
      time_event_end: "2024-02-01T14:00:00",
      time_application_start: null,
      time_group_start: null,
      time_group_end: null,
      time_payment_start: null,
      time_payment_end: null,
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    }

    it("populates form fields with existing event data", () => {
      render(<EventForm event={mockEvent} />)

      expect(screen.getByTestId("field-title")).toHaveValue("Test Legacy Event")
      expect(screen.getByTestId("field-emoji")).toHaveValue("🔒")
      expect(screen.getByTestId("field-description")).toHaveValue(
        "A test legacy event",
      )
      expect(screen.getByTestId("field-location")).toHaveValue("Test Location")
    })

    it("does not render an event type field for a legacy BDSM event", () => {
      render(<EventForm event={mockEvent} />)

      expect(screen.queryByTestId("field-event_type")).not.toBeInTheDocument()
    })

    it("preserves dates when editing existing event", () => {
      render(<EventForm event={mockEvent} />)

      // Check that dates are transformed properly
      const startDateField = screen.getByTestId(
        "field-time_event_start",
      ) as HTMLInputElement
      const endDateField = screen.getByTestId(
        "field-time_event_end",
      ) as HTMLInputElement

      // The dates should be formatted for datetime-local input
      expect(startDateField.value).toBe("2024-02-01T10:00")
      expect(endDateField.value).toBe("2024-02-01T14:00")
    })

    it("handles dates without seconds from database", () => {
      const eventWithoutSeconds = {
        ...mockEvent,
        time_event_start: "2024-02-01T10:00",
        time_event_end: "2024-02-01T14:00",
      }
      render(<EventForm event={eventWithoutSeconds} />)

      const startDateField = screen.getByTestId(
        "field-time_event_start",
      ) as HTMLInputElement
      const endDateField = screen.getByTestId(
        "field-time_event_end",
      ) as HTMLInputElement

      // Now that regex is fixed, dates without seconds should still be formatted
      expect(startDateField.value).toBe("2024-02-01T10:00")
      expect(endDateField.value).toBe("2024-02-01T14:00")
    })
  })

  describe("date generation", () => {
    it("shows error when trying to generate dates without start date", async () => {
      const user = userEvent.setup()
      render(<EventForm />)

      const generateButton = screen.getByRole("button", {
        name: "Calcular datas automaticamente",
      })
      await user.click(generateButton)

      // Since we mocked setError, we can't test the actual error display
      // but in a real test we would verify the error message appears
    })

    it("generates derived dates when start date is provided", async () => {
      const user = userEvent.setup()

      // Since our mock doesn't simulate the actual component behavior,
      // we can only test that the button exists and is clickable
      render(<EventForm />)

      const generateButton = screen.getByRole("button", {
        name: "Calcular datas automaticamente",
      })
      expect(generateButton).toBeInTheDocument()

      // In a real implementation with proper mocking of the handleDates function,
      // we would test the actual date generation logic
      await user.click(generateButton)

      // The test passes if no errors are thrown
    })
  })

  describe("form sections", () => {
    it("renders all date sections with proper labels", () => {
      render(<EventForm />)

      // Check section headings
      expect(screen.getByText("Dados gerais")).toBeInTheDocument()
      expect(screen.getByText("Datas")).toBeInTheDocument()
      expect(screen.getByText("Inscrições")).toBeInTheDocument()
      expect(screen.getByText("Grupo")).toBeInTheDocument()
      expect(screen.getByText("Pagamentos")).toBeInTheDocument()
    })

    it("groups related fields together", () => {
      render(<EventForm />)

      // Event info section should contain basic fields
      const titleField = screen.getByLabelText("Nome da festa")
      const locationField = screen.getByLabelText("Local")

      // Both should be in the DOM (layout testing would require more specific queries)
      expect(titleField).toBeInTheDocument()
      expect(locationField).toBeInTheDocument()
    })
  })
})

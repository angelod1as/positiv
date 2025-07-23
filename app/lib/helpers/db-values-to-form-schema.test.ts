import { describe, expect, it } from "vitest"
import { dbValuesToFormSchema, schemaValuesToDB } from "./db-values-to-form-schema"

describe("dbValuesToFormSchema", () => {
  it("transforms dates with seconds to datetime-local format", () => {
    const input = {
      id: "123",
      title: "Test Event",
      time_event_start: "2024-02-01T10:00:00",
      time_event_end: "2024-02-01T14:00:00",
    }

    const result = dbValuesToFormSchema(input)

    expect(result.time_event_start).toBe("2024-02-01T10:00")
    expect(result.time_event_end).toBe("2024-02-01T14:00")
  })

  it("transforms dates without seconds to datetime-local format", () => {
    const input = {
      id: "123",
      title: "Test Event",
      time_event_start: "2024-02-01T10:00",
      time_event_end: "2024-02-01T14:00",
    }

    const result = dbValuesToFormSchema(input)

    expect(result.time_event_start).toBe("2024-02-01T10:00")
    expect(result.time_event_end).toBe("2024-02-01T14:00")
  })

  it("transforms dates and handles timezone conversion", () => {
    const input = {
      id: "123",
      title: "Test Event",
      time_event_start: "2024-02-01T10:00:00Z",
      time_event_end: "2024-02-01T14:00:00Z",
    }

    const result = dbValuesToFormSchema(input)

    // The formatted result should be a valid datetime-local format
    expect(result.time_event_start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(result.time_event_end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it("transforms dates with milliseconds", () => {
    const input = {
      id: "123",
      title: "Test Event",
      time_event_start: "2024-02-01T10:00:00.123",
      time_event_end: "2024-02-01T14:00:00.456",
    }

    const result = dbValuesToFormSchema(input)

    expect(result.time_event_start).toBe("2024-02-01T10:00")
    expect(result.time_event_end).toBe("2024-02-01T14:00")
  })

  it("converts null values to undefined", () => {
    const input = {
      id: "123",
      title: "Test Event",
      time_event_start: null,
      time_event_end: null,
    }

    const result = dbValuesToFormSchema(input)

    expect(result.time_event_start).toBeUndefined()
    expect(result.time_event_end).toBeUndefined()
  })

  it("preserves non-date string values", () => {
    const input = {
      id: "123",
      title: "Test Event",
      description: "This is a test",
      created_at: "2024-01-01", // Date without time should not be transformed
    }

    const result = dbValuesToFormSchema(input)

    expect(result.id).toBe("123")
    expect(result.title).toBe("Test Event")
    expect(result.description).toBe("This is a test")
    expect(result.created_at).toBe("2024-01-01")
  })

  it("preserves number values", () => {
    const input = {
      id: "123",
      ticket_price: 100,
      total_spots: 50,
    }

    const result = dbValuesToFormSchema(input)

    expect(result.ticket_price).toBe(100)
    expect(result.total_spots).toBe(50)
  })
})

describe("schemaValuesToDB", () => {
  it("converts undefined values to null", () => {
    const input = {
      id: "123",
      time_event_start: undefined,
      time_event_end: undefined,
    }

    const result = schemaValuesToDB(input)

    expect(result.time_event_start).toBeNull()
    expect(result.time_event_end).toBeNull()
  })

  it("preserves non-date values", () => {
    const input = {
      id: "123",
      title: "Test Event",
      ticket_price: 100,
    }

    const result = schemaValuesToDB(input)

    expect(result.id).toBe("123")
    expect(result.title).toBe("Test Event")
    expect(result.ticket_price).toBe(100)
  })
})
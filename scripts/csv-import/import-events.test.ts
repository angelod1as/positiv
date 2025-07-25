import { describe, expect, it } from "vitest"
import { processCSV, validateRow, generateSQL, type CSVRow, type ProcessedEvent } from "./import-events"

describe("CSV Event Import Script", () => {
  describe("CSV Parsing", () => {
    it("should parse a valid CSV file", async () => {
      const csvContent = `title,description,emoji,location,ticket_price,total_spots,time_event_start,event_type
"Workshop de Iniciação","Introdução ao BDSM para iniciantes","🎭","Rua Augusta 123, São Paulo",50.00,30,2024-06-15 19:00:00,bdsm
"Encontro Social","Evento social para a comunidade","🤝","Bar Alternativo, Vila Madalena",25.00,50,2024-07-20 20:00:00,regular`

      const result = await processCSV(csvContent)
      
      expect(result.valid).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
      expect(result.valid[0].title).toBe("Workshop de Iniciação")
      expect(result.valid[1].title).toBe("Encontro Social")
    })

    it("should handle CSV with missing required fields", async () => {
      const csvContent = `title,description,emoji
"Incomplete Event","Missing required fields","🎭"`

      const result = await processCSV(csvContent)
      
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain("Missing required columns")
    })

    it("should handle empty CSV", async () => {
      const csvContent = ""

      const result = await processCSV(csvContent)
      
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain("Empty CSV file")
    })
  })

  describe("Data Validation", () => {
    it("should validate a valid row", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A valid event description",
        emoji: "🎭",
        location: "Valid Location",
        ticket_price: "50.00",
        total_spots: "30",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("should reject invalid title length", () => {
      const row: CSVRow = {
        title: "A",
        description: "A valid event description",
        emoji: "🎭",
        location: "Valid Location",
        ticket_price: "50.00",
        total_spots: "30",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Title must be between 2 and 50 characters")
    })

    it("should reject invalid description length", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A",
        emoji: "🎭",
        location: "Valid Location",
        ticket_price: "50.00",
        total_spots: "30",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Description must be between 2 and 255 characters")
    })

    it("should reject invalid emoji", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A valid event description",
        emoji: "not-an-emoji",
        location: "Valid Location",
        ticket_price: "50.00",
        total_spots: "30",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Invalid emoji")
    })

    it("should reject invalid location length", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A valid event description",
        emoji: "🎭",
        location: "A",
        ticket_price: "50.00",
        total_spots: "30",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Location must be between 2 and 255 characters")
    })

    it("should reject invalid ticket price", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A valid event description",
        emoji: "🎭",
        location: "Valid Location",
        ticket_price: "0",
        total_spots: "30",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Ticket price must be at least 1")
    })

    it("should reject non-numeric ticket price", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A valid event description",
        emoji: "🎭",
        location: "Valid Location",
        ticket_price: "not-a-number",
        total_spots: "30",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Ticket price must be a valid number")
    })

    it("should reject invalid total spots", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A valid event description",
        emoji: "🎭",
        location: "Valid Location",
        ticket_price: "50.00",
        total_spots: "0",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Total spots must be at least 1")
    })

    it("should reject non-integer total spots", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A valid event description",
        emoji: "🎭",
        location: "Valid Location",
        ticket_price: "50.00",
        total_spots: "30.5",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Total spots must be a whole number")
    })

    it("should reject invalid date format", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A valid event description",
        emoji: "🎭",
        location: "Valid Location",
        ticket_price: "50.00",
        total_spots: "30",
        time_event_start: "invalid-date",
        event_type: "bdsm"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Invalid date format for time_event_start")
    })

    it("should reject invalid event type", () => {
      const row: CSVRow = {
        title: "Valid Event",
        description: "A valid event description",
        emoji: "🎭",
        location: "Valid Location",
        ticket_price: "50.00",
        total_spots: "30",
        time_event_start: "2024-06-15 19:00:00",
        event_type: "invalid"
      }

      const result = validateRow(row, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Event type must be 'regular' or 'bdsm'")
    })
  })

  describe("SQL Generation", () => {
    it("should generate correct SQL for valid events", () => {
      const events: ProcessedEvent[] = [{
        id: "test-uuid",
        title: "Workshop de Iniciação",
        description: "Introdução ao BDSM para iniciantes",
        emoji: "🎭",
        location: "Rua Augusta 123, São Paulo",
        ticket_price: 50.00,
        total_spots: 30,
        time_event_start: "2024-06-15 19:00:00",
        time_event_end: "2024-06-15 23:59:00",
        time_application_start: "2024-05-16 08:00:00",
        time_application_end: "2024-05-23 22:00:00",
        time_interviews_start: "2024-05-25 08:00:00",
        time_interviews_end: "2024-06-06 22:00:00",
        time_group_start: "2024-06-08 08:00:00",
        time_group_end: "2024-07-15 22:00:00",
        time_payment_start: "2024-05-25 08:00:00",
        time_payment_end: "2024-06-06 22:00:00",
        event_status: "Completed",
        event_type: "bdsm",
        created_at: "2024-05-16 08:00:00"
      }]

      const sql = generateSQL(events)
      
      expect(sql).toContain("BEGIN;")
      expect(sql).toContain("COMMIT;")
      expect(sql).toContain("INSERT INTO events")
      expect(sql).toContain("'Workshop de Iniciação'")
      expect(sql).toContain("'Completed'")
      expect(sql).toContain("-- Evento: Workshop de Iniciação (2024-06-15)")
    })

    it("should handle multiple events", () => {
      const events: ProcessedEvent[] = [
        {
          id: "test-uuid-1",
          title: "Event 1",
          description: "Description 1",
          emoji: "🎭",
          location: "Location 1",
          ticket_price: 50.00,
          total_spots: 30,
          time_event_start: "2024-06-15 19:00:00",
          time_event_end: "2024-06-15 23:59:00",
          time_application_start: "2024-05-16 08:00:00",
          time_application_end: "2024-05-23 22:00:00",
          time_interviews_start: "2024-05-25 08:00:00",
          time_interviews_end: "2024-06-06 22:00:00",
          time_group_start: "2024-06-08 08:00:00",
          time_group_end: "2024-07-15 22:00:00",
          time_payment_start: "2024-05-25 08:00:00",
          time_payment_end: "2024-06-06 22:00:00",
          event_status: "Completed",
          event_type: "bdsm",
          created_at: "2024-05-16 08:00:00"
        },
        {
          id: "test-uuid-2",
          title: "Event 2",
          description: "Description 2",
          emoji: "🤝",
          location: "Location 2",
          ticket_price: 25.00,
          total_spots: 50,
          time_event_start: "2024-07-20 20:00:00",
          time_event_end: "2024-07-20 23:59:00",
          time_application_start: "2024-06-20 08:00:00",
          time_application_end: "2024-06-27 22:00:00",
          time_interviews_start: "2024-06-29 08:00:00",
          time_interviews_end: "2024-07-11 22:00:00",
          time_group_start: "2024-07-13 08:00:00",
          time_group_end: "2024-08-19 22:00:00",
          time_payment_start: "2024-06-29 08:00:00",
          time_payment_end: "2024-07-11 22:00:00",
          event_status: "Completed",
          event_type: "regular",
          created_at: "2024-06-20 08:00:00"
        }
      ]

      const sql = generateSQL(events)
      
      expect(sql).toContain("'Event 1'")
      expect(sql).toContain("'Event 2'")
      expect(sql.match(/INSERT INTO events/g)).toHaveLength(2)
    })

    it("should escape single quotes in strings", () => {
      const events: ProcessedEvent[] = [{
        id: "test-uuid",
        title: "Event with 'quotes'",
        description: "Description with 'apostrophes'",
        emoji: "🎭",
        location: "O'Brien's Pub",
        ticket_price: 50.00,
        total_spots: 30,
        time_event_start: "2024-06-15 19:00:00",
        time_event_end: "2024-06-15 23:59:00",
        time_application_start: "2024-05-16 08:00:00",
        time_application_end: "2024-05-23 22:00:00",
        time_interviews_start: "2024-05-25 08:00:00",
        time_interviews_end: "2024-06-06 22:00:00",
        time_group_start: "2024-06-08 08:00:00",
        time_group_end: "2024-07-15 22:00:00",
        time_payment_start: "2024-05-25 08:00:00",
        time_payment_end: "2024-06-06 22:00:00",
        event_status: "Completed",
        event_type: "regular",
        created_at: "2024-05-16 08:00:00"
      }]

      const sql = generateSQL(events)
      
      expect(sql).toContain("'Event with ''quotes'''")
      expect(sql).toContain("'Description with ''apostrophes'''")
      expect(sql).toContain("'O''Brien''s Pub'")
    })
  })
})
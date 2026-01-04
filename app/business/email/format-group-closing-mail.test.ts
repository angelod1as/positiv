import { describe, expect, it } from "vitest"
import type { ViewEvent } from "~types/database/entities.types"
import { formatGroupClosingMail } from "./format-group-closing-mail"

describe("formatGroupClosingMail", () => {
  const mockEvent: Omit<ViewEvent, "is_applied"> = {
    id: "test-event-id",
    title: "Test Event",
    emoji: "🎉",
    location: "Test Location",
    time_event_start: "2024-12-25T20:00:00-03:00",
    time_event_end: "2024-12-26T04:00:00-03:00",
    time_application_start: "2024-12-01T10:00:00-03:00",
    time_application_end: "2024-12-20T23:59:59-03:00",
    time_interviews_start: null,
    time_interviews_end: null,
    time_group_start: "2024-12-21T00:00:00-03:00",
    time_group_end: null,
    time_payment_start: null,
    time_payment_end: null,
    description: "Test Description",
    ticket_price: null,
    event_status: "Registration Closed",
  }

  it("should return an object with text and html properties", async () => {
    const result = await formatGroupClosingMail(mockEvent)
    expect(result).toHaveProperty("text")
    expect(result).toHaveProperty("html")
  })

  it("should return HTML containing the group closing template content", async () => {
    const result = await formatGroupClosingMail(mockEvent)
    expect(result.html).toContain("<!DOCTYPE html>")
    expect(result.html).toContain("Fechamos o grupo!")
    expect(result.html).toContain("Quem entrou, entrou")
  })

  it("should convert HTML to plain text without HTML tags", async () => {
    const result = await formatGroupClosingMail(mockEvent)
    expect(result.text).not.toContain("<html")
    expect(result.text).not.toContain("<div")
    expect(result.text).not.toContain("</p>")
  })

  it("should include key content in plain text version", async () => {
    const result = await formatGroupClosingMail(mockEvent)
    expect(result.text).toContain("FECHAMOS O GRUPO!")
    expect(result.text).toContain("Quem entrou, entrou")
    expect(result.text).toContain("Test Event")
  })
})

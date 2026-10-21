import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Event, ProfileWithRoles } from "~types/database/entities.types"
import { applicationCopyFallback } from "./application-mail-copy"
import { loadApplicationCopy } from "./application-mail-copy.server"
import { formatApplicationMail } from "./format-application-mail"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: {
    error: vi.fn(),
    child() {
      return this
    },
  },
}))
vi.mock("./application-mail-copy.server", () => ({
  loadApplicationCopy: vi.fn(),
}))

const profile = {
  id: "profile-1",
  full_name: "Ana Souza",
  social_name: "Ana",
  email: "ana@example.com",
  basic_data_filled: true,
  created_at: "2024-01-01T00:00:00Z",
  is_admin: false,
} as NonNullable<ProfileWithRoles>

const event = {
  id: "event-1",
  title: "Jazz & Blues",
  emoji: "🎷",
  location: "Casa",
  time_event_start: "2026-12-12T22:00:00-03:00",
} as Event

beforeEach(() => {
  vi.mocked(loadApplicationCopy).mockResolvedValue({
    ...applicationCopyFallback,
    subject: "Sua candidatura à {{evento}}",
    bodyParagraphs: ["Oi {{nome}}!"],
  })
})

describe("formatApplicationMail", () => {
  it("builds a plain subject from the copy, with the event in it", async () => {
    const { subject } = await formatApplicationMail(profile, event)

    expect(subject).toBe("Sua candidatura à 🎷 Jazz & Blues")
  })

  it("leaves the emoji out of the subject when the event has none", async () => {
    const { subject } = await formatApplicationMail(profile, {
      ...event,
      emoji: null,
    })

    expect(subject).toBe("Sua candidatura à Jazz & Blues")
  })

  it("falls back to the code subject when the CMS subject fails to render", async () => {
    vi.mocked(loadApplicationCopy).mockResolvedValueOnce({
      ...applicationCopyFallback,
      subject: "Sua candidatura à {{boleto}}",
    })

    const { subject } = await formatApplicationMail(profile, event)

    expect(subject).toBe("Recebemos sua candidatura ao evento 🎷 Jazz & Blues")
  })

  it("renders the html body from the copy and a plain-text part", async () => {
    const { html, text } = await formatApplicationMail(profile, event)

    expect(html).toContain("Oi Ana!")
    expect(text).toContain("Oi Ana!")
  })

  it("falls back to the code copy when the CMS copy fails to render", async () => {
    vi.mocked(loadApplicationCopy).mockResolvedValueOnce({
      ...applicationCopyFallback,
      bodyParagraphs: ["Oi {{boleto}}!"],
    })

    const { html, subject } = await formatApplicationMail(profile, event)

    expect(html).toContain("sua candidatura foi enviada com sucesso")
    expect(html).not.toContain("boleto")
    expect(subject).toBe("Recebemos sua candidatura ao evento 🎷 Jazz & Blues")
  })
})

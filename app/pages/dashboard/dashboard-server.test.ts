import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
  getUserContext: vi.fn(),
}))

vi.mock("~/business/participant/apply-to-event.server", () => ({
  applyToEvent: vi.fn(),
}))

vi.mock("~/business/participant/cancel-application-to-event.server", () => ({
  cancelApplicationToEvent: vi.fn(),
}))

vi.mock("~/business/participant/has-ever-applied.server", () => ({
  hasEverApplied: vi.fn(),
}))

vi.mock("~/lib/analytics/umami.server", () => ({
  trackServerEvent: vi.fn(),
}))

vi.mock("../homepage/fetch/get-next-events", () => ({
  getNextEvents: vi.fn(),
}))

import { getContext, getUserContext } from "~/business/auth/auth.server"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { hasEverApplied } from "~/business/participant/has-ever-applied.server"
import { getNextEvents } from "../homepage/fetch/get-next-events"
import { action, loader } from "./dashboard-page"

const mockGetContext = vi.mocked(getContext)
const mockGetUserContext = vi.mocked(getUserContext)
const mockApplyToEvent = vi.mocked(applyToEvent)
const mockHasEverApplied = vi.mocked(hasEverApplied)
const mockGetNextEvents = vi.mocked(getNextEvents)

const contextFor = (isAdmin: boolean) =>
  ({
    currentProfile: { id: "profile-123", is_admin: isAdmin },
    currentUser: { id: "user-123" },
    supabase: {},
    supabaseHeaders: new Headers(),
  }) as unknown as Awaited<ReturnType<typeof getUserContext>>

const request = (fields: Record<string, string>) =>
  new Request("http://localhost/painel", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  })

const run = (fields: Record<string, string>) =>
  action({
    request: request(fields),
    params: {},
    context: {},
  } as unknown as Parameters<typeof action>[0])

describe("dashboard action — direct admin application", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApplyToEvent.mockResolvedValue({
      success: true,
      data: { emailSent: false },
      errors: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it("applies an admin to the event with the default answers", async () => {
    mockGetUserContext.mockResolvedValue(contextFor(true))

    const result = await run({
      fetchId: "handleAdminApply",
      eventId: "event-123",
    })

    expect(mockApplyToEvent).toHaveBeenCalledTimes(1)

    const values = mockApplyToEvent.mock.calls[0][0] as {
      applicationDate: unknown
    }
    expect(values).toMatchObject({
      eventId: "event-123",
      referred: "Administração",
      skipEmail: true,
    })
    expect(values.applicationDate).toBeInstanceOf(Date)

    expect(result).toBeUndefined()
  })

  it("refuses whoever is not an admin", async () => {
    mockGetUserContext.mockResolvedValue(contextFor(false))

    const result = await run({
      fetchId: "handleAdminApply",
      eventId: "event-123",
    })

    expect(mockApplyToEvent).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: "Você não tem permissão para se candidatar diretamente",
    })
  })

  it("refuses a request with no event", async () => {
    mockGetUserContext.mockResolvedValue(contextFor(true))

    const result = await run({ fetchId: "handleAdminApply" })

    expect(mockApplyToEvent).not.toHaveBeenCalled()
    expect(result).toEqual({ error: "Evento não encontrado." })
  })

  it("reports back the reason the application was refused", async () => {
    mockGetUserContext.mockResolvedValue(contextFor(true))
    mockApplyToEvent.mockResolvedValue({
      success: false,
      errors: [{ message: "Candidaturas encerradas!" }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await run({
      fetchId: "handleAdminApply",
      eventId: "event-123",
    })

    expect(result).toEqual({ error: "Candidaturas encerradas!" })
  })

  it("leaves any other submission alone", async () => {
    const result = await run({ fetchId: "somethingElse", eventId: "event-123" })

    expect(mockGetUserContext).not.toHaveBeenCalled()
    expect(mockApplyToEvent).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
})

describe("dashboard loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNextEvents.mockResolvedValue({
      success: true,
      data: [],
    } as unknown as Awaited<ReturnType<typeof getNextEvents>>)
    mockHasEverApplied.mockResolvedValue(true)
  })

  const load = (isAdmin: boolean) => {
    mockGetContext.mockResolvedValue({
      currentProfile: {
        id: "profile-123",
        basic_data_filled: true,
        is_admin: isAdmin,
      },
    } as unknown as Awaited<ReturnType<typeof getContext>>)

    return loader({
      request: new Request("http://localhost/painel"),
      params: {},
      context: {},
    } as unknown as Parameters<typeof loader>[0])
  }

  it("tells the page that an admin may apply directly", async () => {
    await expect(load(true)).resolves.toMatchObject({ isAdmin: true })
  })

  it("tells the page that anyone else may not", async () => {
    await expect(load(false)).resolves.toMatchObject({ isAdmin: false })
  })
})

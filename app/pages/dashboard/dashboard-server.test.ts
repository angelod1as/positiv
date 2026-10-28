import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

vi.mock("~/business/settings/app-settings.server", () => ({
  isCardPaymentsEnabled: vi.fn(),
}))

vi.mock("../page/fetch/get-next-events", () => ({
  getNextEvents: vi.fn(),
}))

import { getContext, getUserContext } from "~/business/auth/auth.server"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { cancelApplicationToEvent } from "~/business/participant/cancel-application-to-event.server"
import { hasEverApplied } from "~/business/participant/has-ever-applied.server"
import { isCardPaymentsEnabled } from "~/business/settings/app-settings.server"
import { getNextEvents } from "../page/fetch/get-next-events"
import { action, clientAction, loader } from "./dashboard-page"
import { PERMISSIONS } from "~/business/auth/permissions"
import { dashboardCopy } from "~/copy/dashboard"

const mockGetContext = vi.mocked(getContext)
const mockGetUserContext = vi.mocked(getUserContext)
const mockApplyToEvent = vi.mocked(applyToEvent)
const mockCancelApplicationToEvent = vi.mocked(cancelApplicationToEvent)
const mockHasEverApplied = vi.mocked(hasEverApplied)
const mockIsCardPaymentsEnabled = vi.mocked(isCardPaymentsEnabled)
const mockGetNextEvents = vi.mocked(getNextEvents)

const ADMIN = [
  PERMISSIONS.ADMIN_PANEL,
  PERMISSIONS.EVENTS_APPLY_DIRECT,
  PERMISSIONS.EVENTS_APPLY_AS_STAFF,
]
const STAFF = [
  PERMISSIONS.EVENTS_APPLY_DIRECT,
  PERMISSIONS.EVENTS_APPLY_AS_STAFF,
]
const USER: string[] = []

const contextFor = (permissions: string[]) =>
  ({
    currentProfile: { id: "profile-123", permissions },
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

describe("dashboard action — cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContext.mockResolvedValue(
      contextFor(USER) as unknown as Awaited<ReturnType<typeof getContext>>,
    )
    mockCancelApplicationToEvent.mockResolvedValue({
      success: true,
      data: [],
      errors: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it("passes the reason the participant typed on to the cancellation", async () => {
    await run({
      fetchId: "handleConfirmCancel",
      eventId: "event-123",
      reason: "Vou viajar",
    })

    expect(mockCancelApplicationToEvent).toHaveBeenCalledWith({
      eventId: "event-123",
      profileId: "profile-123",
      reason: "Vou viajar",
    })
  })

  it("cancels without a reason when none was typed", async () => {
    await run({ fetchId: "handleConfirmCancel", eventId: "event-123" })

    expect(mockCancelApplicationToEvent).toHaveBeenCalledWith({
      eventId: "event-123",
      profileId: "profile-123",
      reason: undefined,
    })
  })

  it("tells the browser the cancellation went through", async () => {
    const result = await run({
      fetchId: "handleConfirmCancel",
      eventId: "event-123",
    })

    expect(result).toEqual({ ok: true })
  })

  it("fails without recording a cancellation when it is refused", async () => {
    mockCancelApplicationToEvent.mockResolvedValue({
      success: false,
      errors: [
        new Error("A paid registration cannot be cancelled by the participant"),
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await expect(
      run({ fetchId: "handleConfirmCancel", eventId: "event-123" }),
    ).rejects.toThrow(dashboardCopy.cancelFailed)
  })
})

describe("dashboard action — direct application", () => {
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
    mockGetUserContext.mockResolvedValue(contextFor(ADMIN))

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

    expect(result).toEqual({ ok: true })
  })

  it("applies a staff the same way", async () => {
    mockGetUserContext.mockResolvedValue(contextFor(STAFF))

    const result = await run({
      fetchId: "handleAdminApply",
      eventId: "event-123",
    })

    expect(mockApplyToEvent).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true })
  })

  it("refuses whoever may not apply directly", async () => {
    mockGetUserContext.mockResolvedValue(contextFor(USER))

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
    mockGetUserContext.mockResolvedValue(contextFor(ADMIN))

    const result = await run({ fetchId: "handleAdminApply" })

    expect(mockApplyToEvent).not.toHaveBeenCalled()
    expect(result).toEqual({ error: "Evento não encontrado." })
  })

  it("reports back the reason the application was refused", async () => {
    mockGetUserContext.mockResolvedValue(contextFor(ADMIN))
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
    mockIsCardPaymentsEnabled.mockResolvedValue(false)
  })

  const load = (permissions: string[]) => {
    mockGetContext.mockResolvedValue({
      currentProfile: {
        id: "profile-123",
        basic_data_filled: true,
        permissions,
      },
    } as unknown as Awaited<ReturnType<typeof getContext>>)

    return loader({
      request: new Request("http://localhost/painel"),
      params: {},
      context: {},
    } as unknown as Parameters<typeof loader>[0])
  }

  it("tells the page that an admin may apply directly", async () => {
    await expect(load(ADMIN)).resolves.toMatchObject({ canApplyDirectly: true })
  })

  it("tells the page that a staff may apply directly", async () => {
    await expect(load(STAFF)).resolves.toMatchObject({ canApplyDirectly: true })
  })

  it("tells the page that anyone else may not", async () => {
    await expect(load(USER)).resolves.toMatchObject({ canApplyDirectly: false })
  })

  it.each([
    ["an admin", ADMIN, true],
    ["a staff", STAFF, true],
    ["anyone else", USER, false],
  ])("tells the page whether %s applies as staff", async (_, permissions, expected) => {
    await expect(load(permissions)).resolves.toMatchObject({
      appliesAsStaff: expected,
    })
  })

  it("passes the card-payments flag through to the page", async () => {
    mockIsCardPaymentsEnabled.mockResolvedValue(true)
    await expect(load(USER)).resolves.toMatchObject({
      cardPaymentsEnabled: true,
    })
  })
})

describe("dashboard client action — analytics", () => {
  const umamiTrack = vi.fn()

  beforeEach(() => {
    umamiTrack.mockClear()
    vi.stubGlobal("window", { umami: { track: umamiTrack } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const runInBrowser = (
    fields: Record<string, string>,
    serverAction: () => Promise<unknown>,
  ) =>
    clientAction({
      request: request(fields),
      params: {},
      serverAction,
    } as unknown as Parameters<typeof clientAction>[0])

  it("reports a cancellation once the server has made it", async () => {
    const result = await runInBrowser(
      { fetchId: "handleConfirmCancel", eventId: "event-123" },
      () => Promise.resolve({ ok: true }),
    )

    expect(result).toEqual({ ok: true })
    expect(umamiTrack).toHaveBeenCalledWith("cancellation_completed", {
      eventId: "event-123",
    })
  })

  it("reports nothing for a cancellation the server refused", async () => {
    await expect(
      runInBrowser(
        { fetchId: "handleConfirmCancel", eventId: "event-123" },
        () => Promise.reject(new Error(dashboardCopy.cancelFailed)),
      ),
    ).rejects.toThrow(dashboardCopy.cancelFailed)

    expect(umamiTrack).not.toHaveBeenCalled()
  })

  it("reports a direct application once the server has made it", async () => {
    await runInBrowser(
      { fetchId: "handleAdminApply", eventId: "event-123" },
      () => Promise.resolve({ ok: true }),
    )

    expect(umamiTrack).toHaveBeenCalledWith("direct_application_completed", {
      eventId: "event-123",
    })
  })

  it("reports nothing for a direct application the server refused", async () => {
    const refusal = { error: dashboardCopy.directApply.notAllowed }

    const result = await runInBrowser(
      { fetchId: "handleAdminApply", eventId: "event-123" },
      () => Promise.resolve(refusal),
    )

    expect(result).toBe(refusal)
    expect(umamiTrack).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { formAction } from "remix-forms"
import { redirectWithWarning } from "remix-toast"
import type { Route } from "./+types/event-user-data"
import { action, loader } from "./event-user-data"

vi.mock("remix-forms", () => ({
  formAction: vi.fn(),
}))

vi.mock("remix-toast", () => ({
  redirectWithWarning: vi.fn(),
}))

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn().mockResolvedValue({ supabaseHeaders: new Headers() }),
}))

vi.mock("~/lib/analytics/umami.server", () => ({
  trackServerEvent: vi.fn(),
}))

vi.mock("~/business/participant/apply-to-event.server", () => ({
  applyToEvent: vi.fn(),
}))

vi.mock("~/business/session.server", () => ({
  rulesSessionStorage: {
    getSession: vi.fn(),
    commitSession: vi.fn(),
  },
}))

import { rulesSessionStorage } from "~/business/session.server"

const mockFormAction = vi.mocked(formAction)
const mockRedirectWithWarning = vi.mocked(redirectWithWarning)
const mockGetSession = vi.mocked(rulesSessionStorage.getSession)
const mockCommitSession = vi.mocked(rulesSessionStorage.commitSession)

// The action hands remix-forms a transformResult callback and that callback is
// where the redirect lives, so run the action to collect it and then feed it the
// mutation results it has to tell apart.
const transformResultFor = async (): Promise<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (result: any) => Promise<unknown>
> => {
  await action({
    request: new Request("http://localhost", { method: "POST" }),
    params: { id: "event-id" } as Route.ActionArgs["params"],
  } as Route.ActionArgs)

  const options = mockFormAction.mock.calls[0]?.[0]

  if (!options?.transformResult) {
    throw new Error("the action never handed remix-forms a transformResult")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return options.transformResult as any
}

const loadFor = async (passedEvents?: string[]) => {
  mockGetSession.mockResolvedValue({
    get: vi.fn().mockReturnValue(passedEvents),
  } as never)
  mockCommitSession.mockResolvedValue("__session_rules=refreshed")

  return await loader({
    request: new Request("http://localhost/dashboard/event-id/dados"),
    params: { id: "event-id" } as Route.LoaderArgs["params"],
  } as Route.LoaderArgs)
}

const sentBack = (result: unknown) =>
  result instanceof Response ? result.headers.get("location") : null

const cookieOf = (result: unknown) => {
  const headers = (result as { init?: ResponseInit })?.init?.headers

  return new Headers(headers).get("Set-Cookie")
}

describe("event user data loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("turns away a browser that passed no quiz at all", async () => {
    expect(sentBack(await loadFor(undefined))).toBe("/dashboard/event-id/regras")
  })

  it("turns away a browser that passed another event's quiz", async () => {
    expect(sentBack(await loadFor(["another-event"]))).toBe(
      "/dashboard/event-id/regras",
    )
  })

  it("lets in a browser that passed this event's quiz", async () => {
    expect(sentBack(await loadFor(["another-event", "event-id"]))).toBeNull()
  })

  it("restarts the clock while the form is being filled", async () => {
    expect(cookieOf(await loadFor(["event-id"]))).toBe(
      "__session_rules=refreshed",
    )
  })
})

describe("event user data action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sends a finished application to the confirmation page", async () => {
    const transformResult = await transformResultFor()

    const thrown = await transformResult({
      success: true,
      data: { emailSent: true },
    }).catch((error: unknown) => error)

    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).headers.get("location")).toBe(
      "/dashboard/event-id/candidatura-enviada",
    )
    expect(mockRedirectWithWarning).not.toHaveBeenCalled()
  })

  it("warns about the e-mail without claiming the application failed", async () => {
    const transformResult = await transformResultFor()

    await transformResult({
      success: true,
      data: { emailSent: false },
    }).catch(() => undefined)

    expect(mockRedirectWithWarning).toHaveBeenCalledWith(
      "/dashboard/event-id/candidatura-enviada",
      expect.objectContaining({
        message: "Não conseguimos enviar o e-mail",
        description: expect.stringContaining("sua candidatura foi registrada"),
      }),
      expect.anything(),
    )
  })

  it("hands a failed mutation back to remix-forms untouched", async () => {
    const transformResult = await transformResultFor()

    const result = { success: false, errors: [{ message: "nope" }] }

    await expect(transformResult(result)).resolves.toBe(result)
    expect(mockRedirectWithWarning).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { formAction } from "remix-forms"
import { redirectWithWarning } from "remix-toast"
import type { Route } from "./+types/event-user-data"
import { action } from "./event-user-data"

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

const mockFormAction = vi.mocked(formAction)
const mockRedirectWithWarning = vi.mocked(redirectWithWarning)

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

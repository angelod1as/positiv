import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminContext } from "~/business/admin/admin.server"
import { setOnlinePaymentsEnabled } from "~/business/settings/app-settings.server"
import { action } from "./settings-page"

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  setOnlinePaymentsEnabled: vi.fn(),
}))

const buildRequest = (fields: Record<string, string>) =>
  new Request("http://localhost/admin/configuracoes", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  })

const runAction = (fields: Record<string, string>) =>
  action({ request: buildRequest(fields), params: {} } as Parameters<
    typeof action
  >[0])

const INTENTS = [
  {
    intent: "set-online-payments",
    fields: { enabled: "false" },
    mutation: setOnlinePaymentsEnabled,
  },
] as const

describe("SettingsPage action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile: { id: "admin-1" },
    } as Awaited<ReturnType<typeof getAdminContext>>)
  })

  describe.each(INTENTS)("$intent", ({ intent, fields, mutation }) => {
    it("should refuse to run for a non-admin", async () => {
      vi.mocked(getAdminContext).mockRejectedValue(
        new Response(null, { status: 302 }),
      )

      await expect(runAction({ intent, ...fields })).rejects.toBeInstanceOf(
        Response,
      )

      expect(mutation).not.toHaveBeenCalled()
    })

    it("should run for an admin", async () => {
      await runAction({ intent, ...fields })

      expect(getAdminContext).toHaveBeenCalledTimes(1)
      expect(mutation).toHaveBeenCalledTimes(1)
    })
  })

  it.each([
    ["true", true],
    ["false", false],
  ])(
    "should switch online payments to %s on behalf of the admin",
    async (enabled, expected) => {
      await runAction({ intent: "set-online-payments", enabled })

      expect(setOnlinePaymentsEnabled).toHaveBeenCalledWith({
        enabled: expected,
        profileId: "admin-1",
      })
    },
  )
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminContext } from "~/business/admin/admin.server"
import {
  cleanupListmonkTestCampaign,
  testListmonkConnection,
} from "~/business/newsletter/test-listmonk-connection.server"
import { action } from "./dashboard-page"

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getEventsForDashboard: vi.fn(),
  getRecentProfiles: vi.fn(),
}))

vi.mock("~/business/newsletter/test-listmonk-connection.server", () => ({
  cleanupListmonkTestCampaign: vi.fn(),
  testListmonkConnection: vi.fn(),
}))

const buildRequest = (fields: Record<string, string>) =>
  new Request("http://localhost/admin", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  })

const runAction = (fields: Record<string, string>) =>
  action({ request: buildRequest(fields), params: {} } as Parameters<
    typeof action
  >[0])

const INTENTS = [
  { intent: "test-listmonk", fields: {}, mutation: testListmonkConnection },
  {
    intent: "cleanup-listmonk",
    fields: { campaignId: "1" },
    mutation: cleanupListmonkTestCampaign,
  },
] as const

describe("DashboardPage action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue(
      {} as Awaited<ReturnType<typeof getAdminContext>>,
    )
    vi.mocked(testListmonkConnection).mockResolvedValue({} as never)
    vi.mocked(cleanupListmonkTestCampaign).mockResolvedValue({} as never)
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
})

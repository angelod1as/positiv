import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getAdminEventById,
  getProfilesWithExtraDataById,
  getRejectedEventParticipants,
} from "~/business/admin/admin.server"
import { listInvitesForEvent } from "~/business/admin/event-invites.server"
import { getAsaasFeesIfEnabled } from "~/business/payment/asaas-fees.server"
import { getPaymentsForEvent } from "~/business/payment/payment-totals.server"
import { isOnlinePaymentsEnabled } from "~/business/settings/app-settings.server"
import { loader } from "./view-event-page"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getAdminEventById: vi.fn(),
  getEventDemographicsById: vi.fn(),
  getProfilesWithExtraDataById: vi.fn(),
  getRejectedEventParticipants: vi.fn(),
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  isOnlinePaymentsEnabled: vi.fn(),
}))

vi.mock("~/business/admin/event-invites.server", () => ({
  listInvitesForEvent: vi.fn(),
}))

vi.mock("~/business/payment/asaas-fees.server", () => ({
  getAsaasFeesIfEnabled: vi.fn(),
}))

vi.mock("~/business/payment/payment-totals.server", () => ({
  getPaymentsForEvent: vi.fn(),
}))

const runLoader = () =>
  loader({
    request: new Request("http://localhost/admin/eventos/event-1"),
    params: { id: "event-1" },
  } as Parameters<typeof loader>[0])

describe("view event page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(false)
    vi.mocked(getAdminEventById).mockResolvedValue({
      success: true,
      data: { id: "event-1", event_status: "Open" },
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getAdminEventById>>)
    vi.mocked(getProfilesWithExtraDataById).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getProfilesWithExtraDataById>>)
    vi.mocked(getPaymentsForEvent).mockResolvedValue({})
    vi.mocked(getAsaasFeesIfEnabled).mockResolvedValue(null)
    vi.mocked(listInvitesForEvent).mockResolvedValue([])
  })

  it("logs a failed rejected-participants fetch and still renders the page", async () => {
    const error = new Error("connection lost")
    vi.mocked(getRejectedEventParticipants).mockRejectedValue(error)

    const data = await runLoader()

    expect(data.rejectedParticipants).toEqual([])
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to fetch rejected participants",
      { error },
    )
  })

  it.each([true, false])(
    "hands the fee lookup and the payment modal the online payments switch (%s)",
    async (enabled) => {
      vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(enabled)
      vi.mocked(getRejectedEventParticipants).mockResolvedValue([])

      const result = await runLoader()

      expect(getAsaasFeesIfEnabled).toHaveBeenCalledWith(enabled)
      expect(result).toMatchObject({ paymentsEnabled: enabled })
    },
  )
})

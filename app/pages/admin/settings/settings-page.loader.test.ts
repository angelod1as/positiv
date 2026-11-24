import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminContext } from "~/business/auth/admin-context.server"
import { PERMISSIONS } from "~/business/auth/permissions"
import {
  getRegistrationLimit,
  isCardPaymentsEnabled,
  isLikertEnabled,
  isLikertRequired,
} from "~/business/settings/app-settings.server"
import { getOnlinePaymentsSetting } from "~/business/payment/online-payments.server"
import { defaultOnlinePaymentsSetting } from "~/test/online-payments-setting"
import { loader } from "./settings-page"

vi.mock("~/business/auth/admin-context.server", () => ({
  getAdminContext: vi.fn(),
}))

const runLoader = () =>
  loader({
    request: new Request("http://localhost/admin/configuracoes"),
    params: {},
  } as Parameters<typeof loader>[0])

vi.mock("~/business/settings/app-settings.server", () => ({
  getRegistrationLimit: vi.fn(),
  isCardPaymentsEnabled: vi.fn(),
  isLikertEnabled: vi.fn(),
  isLikertRequired: vi.fn(),
}))

vi.mock("~/business/payment/online-payments.server", () => ({
  getOnlinePaymentsSetting: vi.fn(),
}))

describe("SettingsPage loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile: {
        permissions: [PERMISSIONS.ADMIN_PANEL, PERMISSIONS.PAYMENTS_MANAGE],
      },
    } as Awaited<ReturnType<typeof getAdminContext>>)
  })

  it("sends a person without payments.manage back to the admin dashboard", async () => {
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile: { permissions: [PERMISSIONS.ADMIN_PANEL] },
    } as Awaited<ReturnType<typeof getAdminContext>>)

    await expect(runLoader()).rejects.toBeInstanceOf(Response)
    expect(getOnlinePaymentsSetting).not.toHaveBeenCalled()
  })

  it("hands the page the payments settings, the registration limit and the Likert switches", async () => {
    const onlinePayments = {
      ...defaultOnlinePaymentsSetting,
      switchedOn: true,
      providerName: "Asaas",
      providerConfigured: true,
      enabled: true,
    }
    vi.mocked(getOnlinePaymentsSetting).mockResolvedValue(onlinePayments)
    vi.mocked(isCardPaymentsEnabled).mockResolvedValue(true)
    vi.mocked(getRegistrationLimit).mockResolvedValue(120)
    vi.mocked(isLikertEnabled).mockResolvedValue(true)
    vi.mocked(isLikertRequired).mockResolvedValue(false)

    const result = await runLoader()

    expect(result).toEqual({
      onlinePayments,
      cardPayments: true,
      registrationLimit: 120,
      likertEnabled: true,
      likertRequired: false,
    })
  })
})

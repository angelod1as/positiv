import { describe, expect, it, vi } from "vitest"
import {
  getOnlinePaymentsSetting,
  getRegistrationLimit,
  isCardPaymentsEnabled,
} from "~/business/settings/app-settings.server"
import { defaultOnlinePaymentsSetting } from "~/test/online-payments-setting"
import { loader } from "./settings-page"

vi.mock("~/business/settings/app-settings.server", () => ({
  getOnlinePaymentsSetting: vi.fn(),
  getRegistrationLimit: vi.fn(),
  isCardPaymentsEnabled: vi.fn(),
}))

describe("SettingsPage loader", () => {
  it("hands the page the payments settings and the registration limit", async () => {
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

    const result = await loader()

    expect(result).toEqual({
      onlinePayments,
      cardPayments: true,
      registrationLimit: 120,
    })
  })
})

import { describe, expect, it, vi } from "vitest"
import { getOnlinePaymentsSetting } from "~/business/settings/app-settings.server"
import { defaultOnlinePaymentsSetting } from "~/test/online-payments-setting"
import { loader } from "./settings-page"

vi.mock("~/business/settings/app-settings.server", () => ({
  getOnlinePaymentsSetting: vi.fn(),
}))

describe("SettingsPage loader", () => {
  it("hands the page the online payments setting", async () => {
    const onlinePayments = {
      ...defaultOnlinePaymentsSetting,
      switchedOn: true,
      asaasConfigured: true,
      enabled: true,
    }
    vi.mocked(getOnlinePaymentsSetting).mockResolvedValue(onlinePayments)

    const result = await loader()

    expect(result).toEqual({ onlinePayments })
  })
})

import {
  getOnlinePaymentsSwitch,
  isOnlinePaymentsSwitchedOn,
} from "~/business/settings/app-settings.server"
import { paymentProvider } from "./payment-provider.server"

/**
 * The secrets say whether the payment provider can be reached at all. The
 * admin switch says whether it should be. Online payments need both.
 */
export const isProviderConfigured = () => paymentProvider().isConfigured()

export const getOnlinePaymentsSetting = async () => {
  const { switchedOn, updatedAt, updatedByName } =
    await getOnlinePaymentsSwitch()
  const providerConfigured = isProviderConfigured()

  return {
    switchedOn,
    providerName: paymentProvider().name,
    providerConfigured,
    enabled: providerConfigured && switchedOn,
    updatedAt,
    updatedByName,
  }
}

export const isOnlinePaymentsEnabled = async () => {
  if (!isProviderConfigured()) return false

  return isOnlinePaymentsSwitchedOn()
}

import type { getOnlinePaymentsSetting } from "~/business/settings/app-settings.server"

/** The online payments setting as a fresh install has it. */
export const defaultOnlinePaymentsSetting: Awaited<
  ReturnType<typeof getOnlinePaymentsSetting>
> = {
  switchedOn: false,
  providerName: "Asaas",
  providerConfigured: false,
  enabled: false,
  updatedAt: null,
  updatedByName: null,
}

import { getAdminContext } from "~/business/admin/admin.server"
import {
  cleanupListmonkTestCampaign,
  testListmonkConnection,
} from "~/business/newsletter/test-listmonk-connection.server"
import {
  getOnlinePaymentsSetting,
  getRegistrationLimit,
  isCardPaymentsEnabled,
  setCardPaymentsEnabled,
  setOnlinePaymentsEnabled,
  setRegistrationLimit,
} from "~/business/settings/app-settings.server"
import { ListmonkDiagnosticSection } from "~/components/pages/admin/listmonk-diagnostic-section"
import { OnlinePaymentsSection } from "~/components/pages/admin/online-payments-section"
import { RegistrationLimitSection } from "~/components/pages/admin/registration-limit-section"
import { CenteredLayout } from "~/components/layouts/centered-layout"
import { Separator } from "~/components/ui/separator"
import { adminSettingsCopy, registrationLimitSettingCopy } from "~/copy/admin"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import { zod } from "~/lib/helpers/zod"
import { MAX_REGISTRATION_LIMIT } from "~/lib/constants/constants"
import type { Route } from "./+types/settings-page"

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.adminSettings.title)
}

export async function action({ request, params }: Route.ActionArgs) {
  const { currentProfile } = await getAdminContext(request, params)

  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "set-online-payments") {
    await setOnlinePaymentsEnabled({
      enabled: formData.get("enabled") === "true",
      profileId: currentProfile?.id,
    })
    return { intent }
  }

  if (intent === "set-card-payments") {
    await setCardPaymentsEnabled({
      enabled: formData.get("enabled") === "true",
      profileId: currentProfile?.id,
    })
    return { intent }
  }

  if (intent === "set-registration-limit") {
    const limit = zod.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_REGISTRATION_LIMIT)
      .safeParse(formData.get("limit"))
    if (!limit.success) {
      return { intent, error: registrationLimitSettingCopy.invalid }
    }
    await setRegistrationLimit({
      limit: limit.data,
      profileId: currentProfile?.id,
    })
    return { intent }
  }

  if (intent === "test-listmonk") {
    const diagnosticResult = await testListmonkConnection()
    return { intent: "test-listmonk", diagnosticResult }
  }

  if (intent === "cleanup-listmonk") {
    const campaignId = Number(formData.get("campaignId"))
    const cleanupResult = await cleanupListmonkTestCampaign(campaignId)
    return { intent: "cleanup-listmonk", cleanupResult }
  }

  return { intent }
}

export async function loader() {
  return {
    onlinePayments: await getOnlinePaymentsSetting(),
    cardPayments: await isCardPaymentsEnabled(),
    registrationLimit: await getRegistrationLimit(),
  }
}

const SettingsPage = ({ loaderData }: Route.ComponentProps) => {
  return (
    <CenteredLayout>
      <h1>{adminSettingsCopy.title}</h1>

      <OnlinePaymentsSection
        setting={loaderData.onlinePayments}
        cardEnabled={loaderData.cardPayments}
      />

      <Separator />

      <RegistrationLimitSection limit={loaderData.registrationLimit} />

      <Separator />

      <ListmonkDiagnosticSection />
    </CenteredLayout>
  )
}

export default SettingsPage

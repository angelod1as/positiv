import { getAdminContext } from "~/business/admin/admin.server"
import { getContext } from "~/business/auth/auth.server"
import {
  cleanupListmonkTestCampaign,
  testListmonkConnection,
} from "~/business/newsletter/test-listmonk-connection.server"
import { setOnlinePaymentsEnabled } from "~/business/settings/app-settings.server"
import { ListmonkDiagnosticSection } from "~/components/pages/admin/listmonk-diagnostic-section"
import { OnlinePaymentsSection } from "~/components/pages/admin/online-payments-section"
import { Separator } from "~/components/ui/separator"
import { adminSettingsCopy } from "~/copy/admin"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
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

export async function loader({ request, params }: Route.LoaderArgs) {
  const { settings } = await getContext(request, params)
  return { onlinePayments: settings.onlinePayments }
}

const SettingsPage = ({ loaderData }: Route.ComponentProps) => {
  return (
    <>
      <h1>{adminSettingsCopy.title}</h1>

      <OnlinePaymentsSection setting={loaderData.onlinePayments} />

      <Separator />

      <ListmonkDiagnosticSection />
    </>
  )
}

export default SettingsPage

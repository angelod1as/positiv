import { redirectWithError } from "remix-toast"
import { getAdminContext } from "~/business/auth/admin-context.server"
import { canSeePayments } from "~/business/payment/payment-visibility"
import {
  cleanupListmonkTestCampaign,
  testListmonkConnection,
} from "~/business/newsletter/test-listmonk-connection.server"
import { getOnlinePaymentsSetting } from "~/business/payment/online-payments.server"
import {
  getRegistrationLimit,
  isCardPaymentsEnabled,
  isLikertEnabled,
  isLikertRequired,
  setCardPaymentsEnabled,
  setLikertEnabled,
  setLikertRequired,
  setOnlinePaymentsEnabled,
  setRegistrationLimit,
} from "~/business/settings/app-settings.server"
import { LikertSection } from "~/components/pages/admin/likert-section"
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
import { readFormData } from "~/lib/request/read-form-data.server"
import { errorsCopy } from "~/copy/errors"
import paths from "~/lib/paths"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

// How Positiv charges asks for payments.manage on top of entering the admin
// area; the other settings come with the door.
const PAYMENT_INTENTS = new Set(["set-online-payments", "set-card-payments"])

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.adminSettings.title)
}

export async function action({ request, params }: Route.ActionArgs) {
  const { currentProfile } = await getAdminContext(request, params)

  const formData = await readFormData(request)
  const intent = formData.get("intent")

  if (
    typeof intent === "string" &&
    PAYMENT_INTENTS.has(intent) &&
    !canSeePayments(currentProfile)
  ) {
    throw await redirectWithError(
      ADMIN_DASHBOARD,
      errorsCopy.auth.paymentsPermissionRequired,
    )
  }

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

  if (intent === "set-likert") {
    await setLikertEnabled({
      enabled: formData.get("enabled") === "true",
      profileId: currentProfile?.id,
    })
    return { intent }
  }

  if (intent === "set-likert-required") {
    await setLikertRequired({
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

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getAdminContext(request, params)
  const canManagePayments = canSeePayments(currentProfile)

  return {
    onlinePayments: canManagePayments ? await getOnlinePaymentsSetting() : null,
    cardPayments: canManagePayments ? await isCardPaymentsEnabled() : false,
    registrationLimit: await getRegistrationLimit(),
    likertEnabled: await isLikertEnabled(),
    likertRequired: await isLikertRequired(),
  }
}

const SettingsPage = ({ loaderData }: Route.ComponentProps) => {
  return (
    <CenteredLayout>
      <h1>{adminSettingsCopy.title}</h1>

      {loaderData.onlinePayments && (
        <>
          <OnlinePaymentsSection
            setting={loaderData.onlinePayments}
            cardEnabled={loaderData.cardPayments}
          />

          <Separator />
        </>
      )}

      <RegistrationLimitSection limit={loaderData.registrationLimit} />

      <Separator />

      <LikertSection
        enabled={loaderData.likertEnabled}
        required={loaderData.likertRequired}
      />

      <Separator />

      <ListmonkDiagnosticSection />
    </CenteredLayout>
  )
}

export default SettingsPage

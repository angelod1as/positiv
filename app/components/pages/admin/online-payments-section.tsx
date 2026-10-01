import { useState } from "react"
import { useFetcher } from "react-router"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { Label } from "~/components/ui/label"
import { Switch } from "~/components/ui/switch"
import { onlinePaymentsSettingCopy as copy } from "~/copy/admin"
import { sharedCopy } from "~/copy/shared"
import { formatDateTime } from "~/lib/helpers/format-date-time"

type OnlinePaymentsSetting = {
  switchedOn: boolean
  providerName: string
  providerConfigured: boolean
  enabled: boolean
  updatedAt: string | null
  updatedByName: string | null
}

/**
 * Online payments and, under them, the credit card. The card only matters
 * while online payments are on, so it only shows then; its value is kept
 * while hidden. Turning online payments off is the one change that asks first.
 */
export function OnlinePaymentsSection({
  setting,
  cardEnabled,
}: {
  setting: OnlinePaymentsSetting
  cardEnabled: boolean
}) {
  const fetcher = useFetcher()
  const [confirmingOff, setConfirmingOff] = useState(false)
  const isSubmitting = fetcher.state !== "idle"
  const lastChange = formatDateTime(setting.updatedAt, "numeric").full

  const submit = (intent: string, enabled: boolean) =>
    fetcher.submit({ intent, enabled: String(enabled) }, { method: "POST" })

  const onOnlineChange = (checked: boolean) => {
    if (checked) submit("set-online-payments", true)
    else setConfirmingOff(true)
  }

  return (
    <section className="flex flex-col gap-4">
      <h2>{copy.title}</h2>

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="online-payments">{copy.online}</Label>
          <p className="text-sm text-muted-foreground">{copy.onlineHelp(setting.providerName)}</p>
          {!setting.providerConfigured && (
            <p role="alert" className="text-sm text-muted-foreground">
              {copy.notConfigured(setting.providerName)}
            </p>
          )}
        </div>
        <Switch
          id="online-payments"
          checked={setting.enabled}
          disabled={isSubmitting || (!setting.enabled && !setting.providerConfigured)}
          onCheckedChange={onOnlineChange}
        />
      </div>

      {setting.enabled && (
        <div className="ml-6 flex items-start justify-between gap-4 border-l pl-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="card-payments">{copy.card}</Label>
            <p className="text-sm text-muted-foreground">{copy.cardHelp}</p>
          </div>
          <Switch
            id="card-payments"
            checked={cardEnabled}
            disabled={isSubmitting}
            onCheckedChange={(checked) => submit("set-card-payments", checked)}
          />
        </div>
      )}

      {lastChange && setting.updatedByName && (
        <p className="text-xs text-muted-foreground">
          {copy.lastChange(lastChange, setting.updatedByName)}
        </p>
      )}

      <ConfirmDialog
        title={copy.confirmOffTitle}
        description={copy.confirmOffDescription(setting.providerName)}
        confirmLabel={copy.confirmOff}
        cancelLabel={sharedCopy.actions.cancel}
        open={confirmingOff}
        onOpenChange={setConfirmingOff}
        isLoading={isSubmitting}
        onConfirm={(closeDialog) => {
          submit("set-online-payments", false)
          closeDialog()
        }}
      />
    </section>
  )
}

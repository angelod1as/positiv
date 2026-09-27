import { useState } from "react"
import { useFetcher } from "react-router"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { Badge } from "~/components/ui/badge"
import { onlinePaymentsSettingCopy as copy } from "~/copy/admin"
import { sharedCopy } from "~/copy/shared"
import { formatDateTime } from "~/lib/helpers/format-date-time"

type OnlinePaymentsSetting = {
  switchedOn: boolean
  asaasConfigured: boolean
  enabled: boolean
  updatedAt: string | null
  updatedByName: string | null
}

export function OnlinePaymentsSection({
  setting,
}: {
  setting: OnlinePaymentsSetting
}) {
  const fetcher = useFetcher()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const isSubmitting = fetcher.state !== "idle"

  const turningOn = !setting.enabled
  const lastChange = formatDateTime(setting.updatedAt, "numeric").full

  const handleConfirm = (closeDialog: () => void) => {
    fetcher.submit(
      { intent: "set-online-payments", enabled: String(turningOn) },
      { method: "POST" },
    )
    closeDialog()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2>{copy.title}</h2>
          <Badge variant={setting.enabled ? "default" : "secondary"}>
            {setting.enabled ? copy.on : copy.off}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
        <p className="text-sm text-muted-foreground">{copy.whatStays}</p>
        {!setting.asaasConfigured && (
          <p role="alert" className="rounded-md border p-3 text-sm">
            {copy.notConfigured}
          </p>
        )}
        {lastChange && (
          <p className="text-xs text-muted-foreground">
            {copy.lastChange(lastChange, setting.updatedByName)}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <ConfirmDialog
          title={turningOn ? copy.confirmOnTitle : copy.confirmOffTitle}
          description={
            turningOn ? copy.confirmOnDescription : copy.confirmOffDescription
          }
          confirmLabel={turningOn ? copy.confirmOn : copy.confirmOff}
          cancelLabel={sharedCopy.actions.cancel}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          isLoading={isSubmitting}
          onConfirm={handleConfirm}
        >
          <ConfirmDialog.Trigger
            variant={turningOn ? "default" : "destructive"}
            disabled={isSubmitting || (turningOn && !setting.asaasConfigured)}
          >
            {turningOn ? copy.turnOn : copy.turnOff}
          </ConfirmDialog.Trigger>
        </ConfirmDialog>
      </div>
    </div>
  )
}

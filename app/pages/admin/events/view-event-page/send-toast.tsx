import { toast } from "sonner"
import { Copy } from "~/components/atoms/copy/copy"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { adminEventsCopy } from "~/copy/admin/events"
import type { ComposableFetcherData } from "~types/database/entities.types"

export const sendToast = (fetcherData: ComposableFetcherData) => {
  if (!fetcherData) {
    return
  }

  if (!fetcherData.success && fetcherData.errors) {
    const errors = Object.entries(fetcherData.errors).map((entry) => (
      <DataPair key={entry[0]} pair={entry} />
    ))
    return toast.error(
      <div>
        <Copy>{adminEventsCopy.toasts.errorTitle}</Copy>
        {errors}
      </div>,
    )
  }

  if (fetcherData.intent === "update-event-participant") {
    if (!fetcherData.success) {
      return toast.error(adminEventsCopy.toasts.updateParticipantFailed)
    }
    return toast.success(adminEventsCopy.toasts.updateParticipantSuccess)
  }

  if (fetcherData.intent === "send-reminders") {
    return toast.success(adminEventsCopy.toasts.remindersQueued)
  }

  if (fetcherData.intent === "update-event-status") {
    return toast.success(adminEventsCopy.toasts.statusUpdated)
  }

  if (fetcherData.intent === "update-demographics") {
    return toast.success(adminEventsCopy.toasts.demographicsUpdated)
  }

  if (fetcherData.intent === "sync-listmonk-list") {
    if (!fetcherData.success) {
      return toast.error(adminEventsCopy.toasts.listmonkSyncFailed)
    }
    return toast.success(adminEventsCopy.toasts.listmonkSyncSuccess)
  }

  return toast.info(adminEventsCopy.toasts.noIntent)
}

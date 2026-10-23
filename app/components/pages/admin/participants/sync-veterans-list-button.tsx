import { useFetcher } from "react-router"
import type { VeteransSyncResult } from "~/business/newsletter/veterans-list.types"
import { Button } from "~/components/ui/button"
import { adminParticipantsCopy } from "~/copy/admin/participants"

const copy = adminParticipantsCopy.veteransSync

export function SyncVeteransListButton() {
  const fetcher = useFetcher<{
    intent: string
    result?: VeteransSyncResult
    error?: string
  }>()
  const isSubmitting = fetcher.state !== "idle"
  const data = isSubmitting ? undefined : fetcher.data
  const result = data?.result

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        disabled={isSubmitting}
        onClick={() =>
          fetcher.submit({ intent: "sync-veterans-list" }, { method: "POST" })
        }
      >
        {isSubmitting ? copy.syncing : copy.button}
      </Button>
      {result && (
        <p role="status" className="text-sm text-muted-foreground">
          {copy.result(result.added, result.removed, result.total)}
        </p>
      )}
      {data?.error && (
        <p role="alert" className="text-sm text-destructive">
          {data.error}
        </p>
      )}
    </div>
  )
}

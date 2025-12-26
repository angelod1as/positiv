import { AlertTriangleIcon, RefreshCwIcon, PlusIcon } from "lucide-react"
import { useFetcher } from "react-router"
import { Button } from "~/components/atoms/button/button"
import type { EventStatus } from "~types/database/entities.types"

interface ListmonkSyncButtonProps {
  eventStatus: EventStatus
  listmonkListId: number | null
  isStale: boolean
}

export function ListmonkSyncButton({
  eventStatus,
  listmonkListId,
  isStale,
}: ListmonkSyncButtonProps) {
  const fetcher = useFetcher()

  if (eventStatus === "Draft") {
    return null
  }

  const hasExistingList = listmonkListId !== null
  const isSubmitting = fetcher.state !== "idle"

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="sync-listmonk-list" />
      <Button
        type="submit"
        variant="outline"
        disabled={isSubmitting}
        className="flex items-center gap-2"
      >
        {isStale && (
          <AlertTriangleIcon
            className="h-4 w-4 text-amber-500"
            data-testid="stale-warning"
          />
        )}
        {hasExistingList ? (
          <>
            <RefreshCwIcon className="h-4 w-4" />
            {isSubmitting ? "Atualizando..." : "Atualizar Lista"}
          </>
        ) : (
          <>
            <PlusIcon className="h-4 w-4" />
            {isSubmitting ? "Criando..." : "Criar Lista"}
          </>
        )}
      </Button>
    </fetcher.Form>
  )
}

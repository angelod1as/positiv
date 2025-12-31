import { AlertTriangleIcon, RefreshCwIcon, PlusIcon } from "lucide-react"
import type { FetcherWithComponents } from "react-router"
import { Button } from "~/components/atoms/button/button"
import type { ComposableFetcherData } from "~types/database/entities.types"

interface ListmonkSyncButtonProps {
  listmonkListId: number | null
  isStale: boolean
  fetcher: FetcherWithComponents<ComposableFetcherData>
}

export function ListmonkSyncButton({
  listmonkListId,
  isStale,
  fetcher,
}: ListmonkSyncButtonProps) {
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
            {isSubmitting ? "Atualizando..." : "Atualizar lista da newsletter"}
          </>
        ) : (
          <>
            <PlusIcon className="h-4 w-4" />
            {isSubmitting ? "Criando..." : "Criar lista da newsletter"}
          </>
        )}
      </Button>
    </fetcher.Form>
  )
}

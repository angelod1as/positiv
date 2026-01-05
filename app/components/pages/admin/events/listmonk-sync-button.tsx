import { AlertTriangleIcon, RefreshCwIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import type { FetcherWithComponents } from "react-router"
import { Button } from "~/components/atoms/button/button"
import type { ComposableFetcherData } from "~types/database/entities.types"
import { ListmonkFilterModal } from "./listmonk-filter-modal"

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const hasExistingList = listmonkListId !== null
  const isSubmitting =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "sync-listmonk-list"

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={isSubmitting}
        onClick={() => setIsModalOpen(true)}
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

      <ListmonkFilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        fetcher={fetcher}
        hasExistingList={hasExistingList}
      />
    </>
  )
}

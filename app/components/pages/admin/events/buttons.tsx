import { type FC } from "react"
import type { FetcherWithComponents } from "react-router"

import { Button } from "~/components/atoms/button/button"
import paths from "~/lib/paths"
import type { ComposableFetcherData, Event } from "~types/database/entities.types"
import { ListmonkSyncButton } from "./listmonk-sync-button"

const {
  admin: {
    events: { ADMIN_EDIT_EVENT, ADMIN_DOWNLOAD_EVENT },
  },
} = paths

type ButtonProps = {
  event: Event & {
    listmonk_list_id?: number | null
  }
  isListStale: boolean
  fetcher: FetcherWithComponents<ComposableFetcherData>
}
export const Buttons: FC<ButtonProps> = ({ event, isListStale, fetcher: _fetcher }) => {
  const { id, event_status } = event
  const listmonkListId = (event as { listmonk_list_id?: number | null }).listmonk_list_id ?? null

  return (
    <div className="flex gap-2 mb-4 items-center">
      <Button to={ADMIN_EDIT_EVENT(id)}>Editar</Button>
      <Button to={ADMIN_DOWNLOAD_EVENT(id)}>Baixar dados</Button>
      <ListmonkSyncButton
        eventStatus={event_status}
        listmonkListId={listmonkListId}
        isStale={isListStale}
      />
    </div>
  )
}

import { type FC } from "react"
import type { FetcherWithComponents } from "react-router"

import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import { adminEventsCopy } from "~/copy/admin/events"
import { sharedCopy } from "~/copy/shared"
import { mapParticipantsToDownloadFormat } from "~/lib/helpers/download-helpers"
import { downloadXLSX } from "~/lib/helpers/download-xlsx"
import { getWillGoToEventParticipants } from "~/lib/helpers/get-filtered-participants"
import paths from "~/lib/paths"
import type { ComposableFetcherData, Event } from "~types/database/entities.types"
import { ListmonkSyncButton } from "./listmonk-sync-button"

const {
  admin: {
    events: { ADMIN_EDIT_EVENT },
  },
} = paths

type ButtonProps = {
  event: Event
  participants: ProfileWithExtraData[]
  isListStale: boolean
  fetcher: FetcherWithComponents<ComposableFetcherData>
}
export const Buttons: FC<ButtonProps> = ({
  event,
  participants,
  isListStale,
  fetcher,
}) => {
  const { id, event_status, listmonk_list_id } = event

  const handleDownload = () => {
    const filteredParticipants =
      getWillGoToEventParticipants(participants).participants
    downloadXLSX(mapParticipantsToDownloadFormat(filteredParticipants))
  }

  return (
    <div className="flex gap-2 mb-4 items-center">
      <Button to={ADMIN_EDIT_EVENT(id)}>{sharedCopy.actions.edit}</Button>
      <Button onClick={handleDownload}>
        {adminEventsCopy.buttons.download}
      </Button>
      {event_status !== "Draft" && (
        <ListmonkSyncButton
          listmonkListId={listmonk_list_id}
          isStale={isListStale}
          fetcher={fetcher}
        />
      )}
    </div>
  )
}

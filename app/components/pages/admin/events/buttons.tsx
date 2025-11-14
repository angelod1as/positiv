import { type FC } from "react"
import type { FetcherWithComponents } from "react-router"

import { Button } from "~/components/atoms/button/button"
import paths from "~/lib/paths"
import type { ComposableFetcherData, Event } from "~types/database/entities.types"

const {
  admin: {
    events: { ADMIN_EDIT_EVENT, ADMIN_DOWNLOAD_EVENT },
  },
} = paths

type ButtonProps = {
  event: Event
  fetcher: FetcherWithComponents<ComposableFetcherData>
}
export const Buttons: FC<ButtonProps> = ({ event, fetcher: _fetcher }) => {
  const { id } = event

  return (
    <div className="flex gap-2 mb-4 items-center">
      <Button to={ADMIN_EDIT_EVENT(id)}>Editar</Button>
      <Button to={ADMIN_DOWNLOAD_EVENT(id)}>Baixar dados</Button>
    </div>
  )
}

import { useState, type FC } from "react"
import { Button } from "~/components/atoms/button/button"
import { adminAddParticipantsCopy } from "~/copy/admin/add-participants"
import { checkEventStatus } from "~/lib/helpers/check-event-status"
import type { EventStatus } from "~types/database/entities.types"
import { AddParticipantsModal } from "./add-participants-modal"

type AddParticipantsSectionProps = {
  eventId: string
  eventStatus: EventStatus
  canAdd: boolean
  onAdded: () => void
}

export const AddParticipantsSection: FC<AddParticipantsSectionProps> = ({
  eventId,
  eventStatus,
  canAdd,
  onAdded,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!canAdd || !checkEventStatus(eventStatus).acceptsDirectAdditions) {
    return null
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        {adminAddParticipantsCopy.trigger}
      </Button>

      <AddParticipantsModal
        open={isOpen}
        onOpenChange={setIsOpen}
        eventId={eventId}
        onAdded={onAdded}
      />
    </>
  )
}

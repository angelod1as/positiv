import { useState, type FC } from "react"
import type { EventInviteRow } from "~/business/admin/event-invites.server"
import { Button } from "~/components/atoms/button/button"
import { adminInvitesCopy } from "~/copy/admin/invites"
import { checkEventStatus } from "~/lib/helpers/check-event-status"
import type { EventStatus } from "~types/database/entities.types"
import {
  EventInviteModal,
  type InviteModalParticipant,
} from "./event-invite-modal"

type InviteParticipantSectionProps = {
  eventId: string
  eventStatus: EventStatus
  invites: EventInviteRow[]
  participants: InviteModalParticipant[]
}

/**
 * The way into the invite modal, and the one place that decides when there is
 * a way in at all. `applyToEvent` consults an invite only while the event is
 * closed, so offering the button anywhere else would hand the admin a link
 * that leads nowhere and never says why.
 */
export const InviteParticipantSection: FC<InviteParticipantSectionProps> = ({
  eventId,
  eventStatus,
  invites,
  participants,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!checkEventStatus(eventStatus).isClosed) return null

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        {adminInvitesCopy.trigger}
      </Button>

      <EventInviteModal
        open={isOpen}
        onOpenChange={setIsOpen}
        eventId={eventId}
        invites={invites}
        participants={participants}
      />
    </>
  )
}

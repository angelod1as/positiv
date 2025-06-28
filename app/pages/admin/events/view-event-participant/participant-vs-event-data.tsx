import type { FC } from "react"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { eventParticipantPropMap } from "~/lib/helpers/propMaps"
import type { ParticipantVsEvent } from "~types/entities.types"

type ParticipantVsEventDataProps = {
  eventParticipant: ParticipantVsEvent
}
export const ParticipantVsEventData: FC<ParticipantVsEventDataProps> = ({
  eventParticipant,
}) => {
  const {
    application_date,
    bond,
    companions,
    is_social_spot,
    is_user_applied,
    notes,
    payment,
    process_status,
    referrals,
  } = eventParticipant
  return (
    <>
      <h2>Neste evento</h2>

      <div>
        <p>
          {eventParticipantPropMap("is_user_applied")}:{" "}
          {is_user_applied ? "Sim" : "Não"}
        </p>
        <p>
          {eventParticipantPropMap("application_date")}:{" "}
          {formatDateTime(application_date).full}
        </p>
        <p>
          {eventParticipantPropMap("bond")}: {bond || "não respondeu"}
        </p>
        <p>
          {eventParticipantPropMap("companions")}:{" "}
          {companions || "não respondeu"}
        </p>
        <p>
          {eventParticipantPropMap("is_social_spot")}:{" "}
          {is_social_spot ? "Sim" : "Não"}
        </p>
        <p>
          {eventParticipantPropMap("notes")}: {notes || "não respondeu"}
        </p>
        <p>
          {eventParticipantPropMap("payment")}: {payment || "não respondeu"}
        </p>
        <p>
          {eventParticipantPropMap("process_status")}:{" "}
          {process_status || "não respondeu"}
        </p>
        <p>
          {eventParticipantPropMap("referrals")}: {referrals || "não respondeu"}
        </p>
      </div>
    </>
  )
}

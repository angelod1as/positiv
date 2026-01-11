import type {
  ParticipantVsEvent,
  ProfileGlobal,
} from "~types/database/entities.types"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { getAge } from "~/lib/helpers/get-age"
import { BasicData } from "./basic-data"
import { ParticipantVsEventData } from "./participant-vs-event-data"
import { ParticipantEventHistory } from "./participant-event-history"

type ParticipantDetailProps = {
  profile: ProfileWithExtraData | ProfileGlobal
  fullHistory: Array<ParticipantVsEvent & { time_event_start: string }>
  currentEvent?: {
    data: ParticipantVsEvent
    eventId: string
  }
}

export const ParticipantDetail = ({
  profile,
  fullHistory,
  currentEvent,
}: ParticipantDetailProps) => {
  const name = profile.social_name || profile.full_name

  return (
    <>
      <div className="flex">
        <div className="space-y-1">
          <h1>
            {name}, {getAge(profile.date_of_birth)}
          </h1>
          {currentEvent && (
            <p>
              No evento{" "}
              <b>
                {currentEvent.data.event_emoji} {currentEvent.data.event_title}
              </b>
            </p>
          )}
        </div>
      </div>

      {currentEvent && (
        <ParticipantVsEventData eventParticipant={currentEvent.data} />
      )}
      <BasicData profile={profile} />
      {fullHistory.length > 0 && (
        <ParticipantEventHistory participantHistory={fullHistory} />
      )}
    </>
  )
}

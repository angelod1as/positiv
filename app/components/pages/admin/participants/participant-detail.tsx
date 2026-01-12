import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { Card, CardContent } from "~/components/ui/card"
import { getAge } from "~/lib/helpers/get-age"
import type {
  ParticipantVsEvent,
  ProfileGlobal,
} from "~types/database/entities.types"
import { BasicData } from "./basic-data"
import { ParticipantEventHistory } from "./participant-event-history"
import { ParticipantVsEventData } from "./participant-vs-event-data"

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
          <h2>
            {name}, {getAge(profile.date_of_birth)}
          </h2>
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

      {currentEvent ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="sm:col-span-1 lg:col-span-3 py-4">
            <CardContent>
              <ParticipantVsEventData eventParticipant={currentEvent.data} />
            </CardContent>
          </Card>
          <div className="lg:col-span-2">
            <Card className="sm:col-span-1 lg:col-span-3 py-4">
              <CardContent>
                <BasicData profile={profile} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <BasicData profile={profile} />
      )}
      {fullHistory.length > 0 && (
        <ParticipantEventHistory participantHistory={fullHistory} />
      )}
    </>
  )
}

import type {
  ParticipantVsEvent,
  ProfileGlobal,
} from "~types/database/entities.types"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { getAge } from "~/lib/helpers/get-age"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
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

      {currentEvent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="md:col-start-2">
            <CardHeader>
              <CardTitle>Dados do Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipantVsEventData eventParticipant={currentEvent.data} />
            </CardContent>
          </Card>
          <div className="md:col-start-1 md:row-start-1">
            <BasicData profile={profile} />
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

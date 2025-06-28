import { type FC } from "react"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { eventParticipantPropMap } from "~/lib/helpers/propMaps"
import type { ParticipantVsEvent, Profile } from "~types/entities.types"
import type { Database } from "~types/kysely.types"

type ParticipantEventHistoryProps = {
  participantHistory: Array<ParticipantVsEvent>
  profile: Profile
}
export const ParticipantEventHistory: FC<ParticipantEventHistoryProps> = ({
  participantHistory,
}) => {
  return (
    <>
      <h2>Histórico anterior</h2>
      <p>(WIP!)</p>
      <div className="space-y-4">
        {participantHistory.map(
          ({ event_emoji, event_title, ...pastEvent }) => {
            return (
              <div key={pastEvent.id}>
                <h3>
                  {event_emoji} {event_title}
                </h3>
                {Object.keys(pastEvent).map((key) => {
                  const pKey = key as keyof Database["event_participants"]
                  const label = eventParticipantPropMap(pKey)
                  const value = pastEvent[pKey]
                  const dateValue =
                    typeof value === "object"
                      ? formatDateTime((value as unknown as Date).toISOString())
                          .date
                      : undefined
                  return (
                    <DataPair key={key} pair={[label, dateValue || value]} />
                  )
                })}
              </div>
            )
          },
        )}
      </div>
    </>
  )
}

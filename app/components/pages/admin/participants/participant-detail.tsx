import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { ApprovalStatusDropdown } from "~/components/molecules/approval-status-dropdown/approval-status-dropdown"
import { Card, CardContent } from "~/components/ui/card"
import { getAge } from "~/lib/helpers/get-age"
import type {
  EventParticipantWithEvent,
  ParticipantEventHistoryData,
  ProfileGlobal,
} from "~types/database/entities.types"
import { AdminNotesBox } from "./admin-notes-box"
import { BasicData } from "./basic-data"
import { FinancialSummary } from "./financial-summary"
import { ParticipantEventHistory } from "./participant-event-history"
import { ParticipantVsEventData } from "./participant-vs-event-data"

type ParticipantDetailProps = {
  profile: ProfileWithExtraData | ProfileGlobal
  fullHistory: ParticipantEventHistoryData[]
  currentEvent?: {
    data: EventParticipantWithEvent
    eventId: string
  }
}

export const ParticipantDetail = ({
  profile,
  fullHistory,
  currentEvent,
}: ParticipantDetailProps) => {
  const name = profile.social_name || profile.full_name
  // ProfileWithExtraData has profile_id from event_participants join (id is overwritten)
  // ProfileGlobal has id directly from profiles table
  const profileId =
    "profile_id" in profile && profile.profile_id
      ? profile.profile_id
      : profile.id

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
          <div className="mt-4">
            <ApprovalStatusDropdown
              value={profile.approved_to_attend ?? "pending"}
              profileId={profileId}
            />
          </div>
        </div>
      </div>

      {currentEvent ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3 py-4">
            <CardContent>
              <ParticipantVsEventData eventParticipant={currentEvent.data} />
            </CardContent>
          </Card>
          <div className="lg:col-span-2 space-y-4">
            <AdminNotesBox
              profileId={profileId}
              flag={profile.flag ?? "none"}
              flagNotes={profile.flag_notes}
              generalNotes={profile.general_notes}
              isVeteran={profile.is_veteran ?? false}
            />
            <Card className="py-4">
              <CardContent>
                <BasicData profile={profile} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <BasicData profile={profile} />
          <AdminNotesBox
            profileId={profileId}
            flag={profile.flag ?? "none"}
            flagNotes={profile.flag_notes}
            generalNotes={profile.general_notes}
            isVeteran={profile.is_veteran ?? false}
          />
        </div>
      )}
      {fullHistory.length > 0 && (
        <>
          <ParticipantEventHistory participantHistory={fullHistory} />
          <FinancialSummary participantHistory={fullHistory} />
        </>
      )}
    </>
  )
}

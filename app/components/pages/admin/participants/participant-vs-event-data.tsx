import type { FC } from "react"
import { updateParticipantVsEventSchema } from "~/business/admin/common"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { SchemaForm } from "~/components/forms/base/schema-form"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import {
  applicationStatusOptions,
  approvedToAttendStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  flagStatusOptions,
  profilePropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import { type ParticipantVsEvent } from "~types/database/entities.types"
import type { Database } from "~types/database/kysely.types"

type ParticipantVsEventDataProps = {
  eventParticipant: ParticipantVsEvent
}
export const ParticipantVsEventData: FC<ParticipantVsEventDataProps> = ({
  eventParticipant,
}) => {
  const { application_date, bond, companions, notes, referrals, referred } =
    eventParticipant

  const labels = Object.keys(eventParticipant).reduce(
    (acc, curr) => {
      return {
        ...acc,
        [curr]: eventParticipantPropMap(
          curr as keyof Database["event_participants"],
        ),
      }
    },
    {
      approved_to_attend: profilePropMap("approved_to_attend"),
      flag: profilePropMap("flag"),
      flag_notes: profilePropMap("flag_notes"),
    },
  )

  return (
    <>
      <h2>Neste evento</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3>Administração</h3>

          <SchemaForm
            schema={updateParticipantVsEventSchema}
            buttonLabel="Salvar"
            hiddenFields={["intent", "event_id", "profile_id"]}
            values={{
              ...eventParticipant,
              intent: "participant-vs-event-schema",
              payment: Number(eventParticipant.payment),
            }}
            inputTypes={{
              has_paid: "checkbox",
              is_veteran: "checkbox",
              payment: "number",
              spot_type: "select",
              approved_to_attend: "select",
              flag: "select",
              flag_notes: "textarea",
            }}
            options={{
              attendance_status: attendanceStatusOptions,
              application_status: applicationStatusOptions,
              spot_type: spotTypeOptions,
              approved_to_attend: approvedToAttendStatusOptions,
              flag: flagStatusOptions,
            }}
            labels={labels}
          >
            {({ Field, Errors, Error, Button }) => {
              return (
                <>
                  {/* Hidden */}
                  <Field name="intent" hidden />
                  <Field name="event_id" hidden />
                  <Field name="profile_id" hidden />

                  <div className="space-y-2">
                    <Field name="attendance_status" />
                    <Field name="application_status" />
                    <Field name="approved_to_attend" />
                    <Field name="spot_type" />
                    <Field name="payment" />
                    <div className="flex gap-8">
                      <Field name="has_paid" />
                      <Field name="is_veteran" />
                    </div>
                    <Field name="flag" />
                    <Field name="flag_notes" multiline />
                    <Field name="admin_general_notes" multiline />
                    <Error />
                    <Errors />
                    <Button />
                  </div>
                </>
              )
            }}
          </SchemaForm>
        </div>

        <div className="space-y-2">
          <h3>Respostas</h3>
          <DataPair
            pair={[
              eventParticipantPropMap("application_date"),
              formatDateTime(application_date).full,
            ]}
          />
          <DataPair
            pair={[eventParticipantPropMap("bond"), bond || "não respondeu"]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("companions"),
              companions || "não respondeu",
            ]}
          />
          <DataPair
            pair={[
              `${eventParticipantPropMap("notes")} (Participante)`,
              notes || "não respondeu",
            ]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("referrals"),
              referrals || "não respondeu",
            ]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("referred"),
              referred || "não respondeu",
            ]}
          />
        </div>
      </div>
    </>
  )
}

import {
  participantApplicationStatusPropMap,
  participantAttendanceStatusPropMap,
  profileApprovedToAttendStatusPropMap,
} from "~/lib/helpers/propMaps"

function createTooltipSection(title: string, items: string[]) {
  return (
    <div>
      <p className="font-semibold">{title}:</p>
      <ul className="list-disc list-inside pl-2">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export const generalTooltipContent = (
  <p>
    Total de todas as candidaturas registradas para este evento, independente de
    status.
  </p>
)

export const acceptedInProcessTooltipContent = (
  <div className="space-y-2">
    <p>Pessoas que atendem simultaneamente aos seguintes critérios:</p>

    {createTooltipSection("Status de Processo (application_status)", [
      participantApplicationStatusPropMap("sent_payment_data"),
      participantApplicationStatusPropMap("sent_rules"),
      participantApplicationStatusPropMap("talking"),
      participantApplicationStatusPropMap("finalised"),
    ])}

    {createTooltipSection("Status de Presença (attendance_status)", [
      participantAttendanceStatusPropMap("attended"),
      participantAttendanceStatusPropMap("pending"),
    ])}

    {createTooltipSection("Status de Aprovação (approved_to_attend)", [
      profileApprovedToAttendStatusPropMap("approved"),
      profileApprovedToAttendStatusPropMap("approved_with_reservations"),
      profileApprovedToAttendStatusPropMap("pending"),
    ])}
  </div>
)

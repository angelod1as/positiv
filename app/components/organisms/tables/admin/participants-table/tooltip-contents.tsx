import { adminTablesCopy } from "~/copy/admin/tables"
import {
  participantApplicationStatusPropMap,
  participantAttendanceStatusPropMap,
  profileApprovedToAttendStatusPropMap,
} from "~/lib/helpers/propMaps"

const tooltipsCopy = adminTablesCopy.eventParticipants.tooltips

function createTooltipSection(title: string, items: string[]) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <ul className="list-disc list-inside pl-2">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export const generalTooltipContent = <p>{tooltipsCopy.general}</p>

export const acceptedInProcessTooltipContent = (
  <div className="space-y-2">
    <p>{tooltipsCopy.acceptedInProcessIntro}</p>

    {createTooltipSection(tooltipsCopy.applicationStatusSection, [
      participantApplicationStatusPropMap("sent_payment_data"),
      participantApplicationStatusPropMap("sent_rules"),
      participantApplicationStatusPropMap("talking"),
      participantApplicationStatusPropMap("finalised"),
    ])}

    {createTooltipSection(tooltipsCopy.attendanceStatusSection, [
      participantAttendanceStatusPropMap("attended"),
      participantAttendanceStatusPropMap("pending"),
    ])}

    {createTooltipSection(tooltipsCopy.approvedToAttendSection, [
      profileApprovedToAttendStatusPropMap("approved"),
      profileApprovedToAttendStatusPropMap("approved_with_reservations"),
      profileApprovedToAttendStatusPropMap("pending"),
    ])}
  </div>
)

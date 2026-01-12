import { useState, useEffect } from "react"
import { useFetcher } from "react-router"
import { cn } from "~/lib/utils"
import { approvedToAttendStatusOptions } from "~/lib/helpers/propMaps"
import type { ProfileApprovedToAttendStatus } from "~types/database/entities.types"

type ApprovalStatusDropdownProps = {
  value: ProfileApprovedToAttendStatus
  profileId: string
  eventId: string
}

const statusColors: Record<ProfileApprovedToAttendStatus, string> = {
  approved: "bg-green-100 border-green-500 text-green-800",
  approved_with_reservations: "bg-yellow-100 border-yellow-500 text-yellow-800",
  rejected: "bg-red-100 border-red-500 text-red-800",
  pending: "bg-gray-100 border-gray-300 text-gray-800",
}

export function ApprovalStatusDropdown({
  value,
  profileId,
  eventId,
}: ApprovalStatusDropdownProps) {
  const fetcher = useFetcher()
  const [optimisticValue, setOptimisticValue] =
    useState<ProfileApprovedToAttendStatus>(value)

  useEffect(() => {
    setOptimisticValue(value)
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value as ProfileApprovedToAttendStatus
    setOptimisticValue(newValue)
    fetcher.submit(
      {
        intent: "participant-vs-event-schema",
        profile_id: profileId,
        event_id: eventId,
        approved_to_attend: newValue,
      },
      { method: "POST" }
    )
  }

  return (
    <select
      value={optimisticValue}
      onChange={handleChange}
      className={cn(
        "block rounded-md py-2 pr-10 pl-3 text-base font-medium focus:outline-none sm:text-sm border-2 cursor-pointer",
        statusColors[optimisticValue]
      )}
    >
      {approvedToAttendStatusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.name}
        </option>
      ))}
    </select>
  )
}

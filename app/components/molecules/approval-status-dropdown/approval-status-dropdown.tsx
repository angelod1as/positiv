import { useEffect, useRef } from "react"
import { useFetcher, useRevalidator } from "react-router"
import { toast } from "sonner"
import { cn } from "~/lib/utils"
import { approvedToAttendStatusOptions } from "~/lib/helpers/propMaps"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import type { ProfileApprovedToAttendStatus } from "~types/database/entities.types"

type ApprovalStatusDropdownProps = {
  value: ProfileApprovedToAttendStatus
  profileId: string
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
}: ApprovalStatusDropdownProps) {
  const fetcher = useFetcher<{ success: boolean }>()
  const revalidator = useRevalidator()
  const previousDataRef = useRef(fetcher.data)
  const isSubmitting = fetcher.state !== "idle"

  useEffect(() => {
    if (fetcher.data && fetcher.data !== previousDataRef.current) {
      if (fetcher.data.success) {
        toast.success("Status de aprovação atualizado")
        revalidator.revalidate()
      } else {
        toast.error("Erro ao atualizar status")
      }
    }
    previousDataRef.current = fetcher.data
  }, [fetcher.data, revalidator])

  const handleChange = (newValue: string) => {
    fetcher.submit(
      {
        intent: "update-profile-approval-status",
        profile_id: profileId,
        approved_to_attend: newValue,
      },
      { method: "POST" }
    )
  }

  const currentOption = approvedToAttendStatusOptions.find(
    (opt) => opt.value === value
  )

  const labelId = `approval-status-label-${profileId}`

  return (
    <div className="flex items-center gap-3">
      <label id={labelId} className="text-sm font-medium text-gray-700">
        Status de Aprovação
      </label>
      <Select value={value} onValueChange={handleChange} disabled={isSubmitting}>
        <SelectTrigger
          aria-labelledby={labelId}
          className={cn(
            "w-auto min-w-[180px] border-2",
            statusColors[value],
            isSubmitting && "opacity-50 cursor-wait"
          )}
        >
          <SelectValue>
            {isSubmitting ? "Salvando..." : currentOption?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {approvedToAttendStatusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

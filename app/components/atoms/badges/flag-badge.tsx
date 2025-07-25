import { Flag } from "lucide-react"
import { type ProfileFlagStatus } from "~/types/database/entities.types"
import { cn } from "~/lib/utils"
import { profileFlagStatusMap } from "~/lib/helpers/propMaps"

interface FlagBadgeProps {
  flag: ProfileFlagStatus
  flagNotes?: string | null
  showTooltip?: boolean
}

export const FlagBadge = ({ flag, flagNotes, showTooltip = true }: FlagBadgeProps) => {
  if (flag === "none") return null

  const flagColorClass = {
    yellow: "text-yellow-500",
    red: "text-red-500",
    none: "",
  }[flag]

  const title = showTooltip && flagNotes 
    ? `${profileFlagStatusMap(flag)}: ${flagNotes}` 
    : profileFlagStatusMap(flag)

  return (
    <span title={title}>
      <Flag 
        className={cn("size-4", flagColorClass)} 
        aria-label={profileFlagStatusMap(flag)}
      />
    </span>
  )
}
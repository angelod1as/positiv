import { Flag } from "lucide-react"
import { type ProfileFlagStatus } from "~/types/database/entities.types"
import { cn } from "~/lib/utils"
import { profileFlagStatusMap } from "~/lib/helpers/propMaps"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"

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
    gray: "text-gray-500",
    none: "",
  }[flag]

  const getFlagMessage = () => 
    flagNotes ? `${profileFlagStatusMap(flag)}: ${flagNotes}` : profileFlagStatusMap(flag)

  const ariaLabel = getFlagMessage()

  if (!showTooltip || !flagNotes) {
    return (
      <span 
        role="img" 
        aria-label={ariaLabel}
      >
        <Flag 
          className={cn("size-4", flagColorClass)}
        />
      </span>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            role="img" 
            aria-label={ariaLabel}
            className="inline-flex cursor-default"
          >
            <Flag 
              className={cn("size-4", flagColorClass)}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{flagNotes}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
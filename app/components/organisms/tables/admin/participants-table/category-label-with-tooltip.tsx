import { HelpCircle } from "lucide-react"
import type { ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"

type CategoryLabelWithTooltipProps = {
  label: string
  tooltipContent: ReactNode
}

export function CategoryLabelWithTooltip({
  label,
  tooltipContent,
}: CategoryLabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-1">
      <p>{label}:</p>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-gray-500 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="font-normal text-sm">
          <div className="max-w-md">{tooltipContent}</div>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

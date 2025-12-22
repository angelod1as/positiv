import type { ComponentType } from "react"
import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"

type ColumnHeaderOptions = {
  tooltip?: string
  icon?: ComponentType<{ className?: string }>
  tooltipMaxWidth?: string
  delayDuration?: number
}

export function createColumnHeader(
  text: string,
  options?: ColumnHeaderOptions,
) {
  if (!options?.tooltip) {
    return <span>{text}</span>
  }

  const Icon = options.icon || Info
  const tooltipMaxWidth = options.tooltipMaxWidth || "max-w-xs"
  const delayDuration = options.delayDuration ?? 0

  return (
    <div className="flex items-center gap-1">
      <span>{text}</span>
      <TooltipProvider delayDuration={delayDuration}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Icon className="h-3.5 w-3.5 text-gray-500 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className={tooltipMaxWidth}>{options.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

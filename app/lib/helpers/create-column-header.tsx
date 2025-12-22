import { Info } from "lucide-react"
import type { ComponentType, ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"

type ColumnHeaderOptions = {
  tooltip?: ReactNode
  icon?: ComponentType<{ className?: string }>
  tooltipMaxWidth?: string
}

export function createColumnHeader(
  text: string,
  options?: ColumnHeaderOptions,
) {
  if (!options?.tooltip) {
    return <span className="text-sm">{text}</span>
  }

  const Icon = options.icon || Info
  const tooltipMaxWidth = options.tooltipMaxWidth || "max-w-md"

  return (
    <div className="flex items-center gap-1 text-sm">
      <span>{text}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className="h-3.5 w-3.5 text-gray-500 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="font-normal text-sm">
          <div className={tooltipMaxWidth}>{options.tooltip}</div>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

import type { ICellRendererParams } from "ag-grid-community"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"

interface TruncatedTextRendererParams {
  truncateLength?: number
}

const DEFAULT_TRUNCATE_LENGTH = 25

export function TruncatedTextRenderer(
  params: ICellRendererParams & TruncatedTextRendererParams
) {
  const { value, truncateLength = DEFAULT_TRUNCATE_LENGTH } = params
  const text = String(value ?? "")
  const shouldTruncate = text.length > truncateLength
  const displayText = shouldTruncate
    ? text.slice(0, truncateLength).trim() + "..."
    : text

  if (!shouldTruncate) {
    return <span>{displayText}</span>
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help" tabIndex={0} aria-label={text}>
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs whitespace-pre-wrap">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

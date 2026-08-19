import { adminTablesCopy } from "~/copy/admin/tables"
import { cn } from "~/lib/utils"

export type SaveStatus = "idle" | "saving" | "success" | "error"

interface SaveStatusIndicatorProps {
  status: SaveStatus
  errorMessage?: string
}

const statusConfig = {
  idle: { color: "bg-blue-500", text: adminTablesCopy.saveStatus.idle },
  saving: { color: "bg-amber-500", text: adminTablesCopy.saveStatus.saving },
  success: { color: "bg-green-500", text: adminTablesCopy.saveStatus.success },
  error: { color: "bg-red-500", text: adminTablesCopy.saveStatus.error },
}

export function SaveStatusIndicator({
  status,
  errorMessage,
}: SaveStatusIndicatorProps) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 shadow-md">
      <span className={cn("h-3 w-3 rounded-full", config.color)} />
      <span className="text-xs font-medium text-gray-700">
        {errorMessage || config.text}
      </span>
    </div>
  )
}

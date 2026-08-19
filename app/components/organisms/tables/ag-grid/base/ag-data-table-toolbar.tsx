import { FilterXIcon, MaximizeIcon, MinimizeIcon, RotateCcwIcon } from "lucide-react"
import type { GridApi } from "ag-grid-community"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { adminTablesCopy } from "~/copy/admin/tables"

interface AGDataTableToolbarProps {
  gridApi: GridApi | null
  clearState: () => void
  onClearFilters?: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export function AGDataTableToolbar({
  gridApi,
  clearState,
  onClearFilters,
  isFullscreen,
  onToggleFullscreen,
}: AGDataTableToolbarProps) {
  const handleClearFilters = () => {
    gridApi?.setFilterModel(null)
    onClearFilters?.()
  }

  const handleResetTable = () => {
    clearState()
    gridApi?.setFilterModel(null)
    gridApi?.resetColumnState()
    onClearFilters?.()
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClearFilters}
        title={adminTablesCopy.toolbar.clearFiltersTitle}
      >
        <FilterXIcon className="mr-2 h-4 w-4" />
        {adminTablesCopy.toolbar.clearFilters}
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetTable}
          >
            <RotateCcwIcon className="mr-2 h-4 w-4" />
            {adminTablesCopy.toolbar.resetTable}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">
            {adminTablesCopy.toolbar.resetTableDescription}
          </p>
        </TooltipContent>
      </Tooltip>

      <Button
        variant="outline"
        size="sm"
        onClick={onToggleFullscreen}
        title={
          isFullscreen
            ? adminTablesCopy.toolbar.minimizeTitle
            : adminTablesCopy.toolbar.fullscreenTitle
        }
      >
        {isFullscreen ? (
          <>
            <MinimizeIcon className="mr-2 h-4 w-4" />
            {adminTablesCopy.toolbar.minimize}
          </>
        ) : (
          <>
            <MaximizeIcon className="mr-2 h-4 w-4" />
            {adminTablesCopy.toolbar.fullscreen}
          </>
        )}
      </Button>
    </div>
  )
}

import { FilterXIcon, MaximizeIcon, MinimizeIcon, RotateCcwIcon } from "lucide-react"
import type { GridApi } from "ag-grid-community"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"

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
    onClearFilters?.()
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClearFilters}
        title="Limpar todos os filtros"
      >
        <FilterXIcon className="mr-2 h-4 w-4" />
        Limpar filtros
      </Button>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetTable}
            >
              <RotateCcwIcon className="mr-2 h-4 w-4" />
              Resetar tabela
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              Limpa todos os dados salvos da organização da tabela, como
              filtros, posições de colunas e paginação
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        variant="outline"
        size="sm"
        onClick={onToggleFullscreen}
        title={isFullscreen ? "Minimizar" : "Expandir para tela cheia"}
      >
        {isFullscreen ? (
          <>
            <MinimizeIcon className="mr-2 h-4 w-4" />
            Minimizar
          </>
        ) : (
          <>
            <MaximizeIcon className="mr-2 h-4 w-4" />
            Tela cheia
          </>
        )}
      </Button>
    </div>
  )
}

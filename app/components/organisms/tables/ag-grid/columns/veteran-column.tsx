import type { ColDef, ValueSetterParams } from "ag-grid-community"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { VeteranSelectCellRenderer } from "~/components/organisms/tables/ag-grid/renderers/veteran-select-cell-renderer"
import { isVeteranOptions } from "~/lib/helpers/propMaps"

const VETERAN_LABEL = "Veterane"
const NOVATE_LABEL = "Novate"

interface VeteranColumnParams {
  filterModel: string[]
  onFilterChange: (value: string[]) => void
  editable?: boolean
}

export function getVeteranColumn({
  filterModel,
  onFilterChange,
  editable = false,
}: VeteranColumnParams): ColDef {
  return {
    field: "is_veteran",
    headerName: "Vet ou Nov?",
    headerTooltip: "Veterane ou Novate",
    editable,
    ...(editable && {
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: [VETERAN_LABEL, NOVATE_LABEL],
        valueListMaxHeight: 120,
      },
      valueFormatter: (params) =>
        params.value === true ? VETERAN_LABEL : NOVATE_LABEL,
      valueSetter: (params: ValueSetterParams) => {
        if (!params.data) return false
        const newValue = params.newValue === VETERAN_LABEL
        if (newValue === params.data.is_veteran) return false
        params.data.is_veteran = newValue
        return true
      },
    }),
    cellRenderer: VeteranSelectCellRenderer,
    filter: BaseMultiSelectFilter,
    filterParams: {
      options: isVeteranOptions,
      field: "is_veteran",
      model: filterModel,
      onModelChange: onFilterChange,
    },
    sortable: true,
  }
}

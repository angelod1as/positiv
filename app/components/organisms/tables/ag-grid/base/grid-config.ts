import type { ColDef, GridOptions } from "ag-grid-community"
import { BaseMultiSelectFilter } from "../filters/base-multi-select-filter"

export const defaultColDef: ColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  minWidth: 100,
}

export const defaultGridOptions: GridOptions = {
  rowHeight: 48,
  headerHeight: 48,
  animateRows: true,
  enableCellTextSelection: true,
}

export const frameworkComponents: GridOptions["components"] = {
  baseMultiSelectFilter: BaseMultiSelectFilter,
}

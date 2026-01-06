import type { ColDef, GridOptions } from "ag-grid-community"

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

export const frameworkComponents: Record<string, unknown> = {}

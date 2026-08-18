import type { ICellRendererParams } from "ag-grid-community"
import { adminTablesCopy } from "~/copy/admin/tables"

export function BooleanTextRenderer(params: ICellRendererParams) {
  const value = params.value as boolean | null | undefined

  if (value === true) {
    return <>{adminTablesCopy.renderers.booleanYes}</>
  }

  return null
}

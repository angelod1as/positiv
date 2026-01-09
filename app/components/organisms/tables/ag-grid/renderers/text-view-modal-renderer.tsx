import type { ICellRendererParams } from "ag-grid-community"
import { TextViewModalCell } from "~/components/forms/admin/text-view-modal-cell"

export function TextViewModalRenderer(params: ICellRendererParams) {
  const value = params.value as string | null | undefined
  const label = params.colDef?.headerName

  return <TextViewModalCell value={value} label={label} />
}

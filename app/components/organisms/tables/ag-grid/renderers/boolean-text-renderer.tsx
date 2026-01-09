import type { ICellRendererParams } from "ag-grid-community"

export function BooleanTextRenderer(params: ICellRendererParams) {
  const value = params.value as boolean | null | undefined

  if (value === true) {
    return <>Sim</>
  }

  return null
}

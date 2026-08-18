import type { ICellRendererParams } from "ag-grid-community"
import { adminTablesCopy } from "~/copy/admin/tables"

export function PronounsRenderer(params: ICellRendererParams) {
  const pronouns = params.value as string[] | null | undefined

  if (!pronouns || pronouns.length === 0) {
    return <>{adminTablesCopy.renderers.emptyValue}</>
  }

  return <>{pronouns.join(", ")}</>
}

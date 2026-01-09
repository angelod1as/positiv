import type { ICellRendererParams } from "ag-grid-community"

export function PronounsRenderer(params: ICellRendererParams) {
  const pronouns = params.value as string[] | null | undefined

  if (!pronouns || pronouns.length === 0) {
    return <>-</>
  }

  return <>{pronouns.join(", ")}</>
}

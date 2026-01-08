import type { ICellRendererParams } from "ag-grid-community"
import { GenderWarning, OrientationWarning } from "~/components/atoms/badges/badges"

export function WarningIndicatorRenderer(params: ICellRendererParams) {
  const values = params.value as string[] | null | undefined
  const field = params.colDef?.field

  if (!values || values.length === 0) return null

  if (field === "gender") {
    return <GenderWarning genders={values} />
  }

  if (field === "orientation") {
    return <OrientationWarning orientations={values} />
  }

  return null
}

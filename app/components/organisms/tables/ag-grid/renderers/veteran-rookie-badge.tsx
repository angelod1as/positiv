import type { ICellRendererParams } from "ag-grid-community"
import { Badge } from "~/components/ui/badge"

export function VeteranRookieBadge(params: ICellRendererParams) {
  const isVeteran = Boolean(params.value)

  return (
    <Badge variant={isVeteran ? "veteran" : "rookie"}>
      {isVeteran ? "Veterano" : "Novato"}
    </Badge>
  )
}

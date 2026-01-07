import type { ICellRendererParams } from "ag-grid-community"
import { VeteranRookieBadge } from "~/components/atoms/badges/veteran-rookie-badge"

export function VeteranRookieBadgeRenderer(params: ICellRendererParams) {
  return <VeteranRookieBadge isVeteran={Boolean(params.value)} />
}

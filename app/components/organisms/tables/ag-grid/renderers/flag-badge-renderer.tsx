import type { ICellRendererParams } from "ag-grid-community"
import { FlagBadge } from "~/components/atoms/badges/flag-badge"

export function FlagBadgeRenderer(params: ICellRendererParams) {
  return <FlagBadge flag={params.value} flagNotes={params.data?.flag_notes} />
}

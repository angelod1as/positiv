import type { ICellRendererParams } from "ag-grid-community"
import { FlagBadge } from "~/components/atoms/badges/flag-badge"
import type { ProfileFlagStatus } from "~/types/database/entities.types"

export function FlagBadgeRenderer(params: ICellRendererParams) {
  const flag = params.value as ProfileFlagStatus | undefined

  if (!flag) return null

  return <FlagBadge flag={flag} flagNotes={params.data?.flag_notes} />
}

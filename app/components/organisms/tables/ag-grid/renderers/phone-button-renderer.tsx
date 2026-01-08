import type { ICellRendererParams } from "ag-grid-community"
import { PhoneButton } from "~/lib/helpers/phone-to-button"

export function PhoneButtonRenderer(params: ICellRendererParams) {
  const phone = params.value as number | null | undefined

  if (!phone) return null

  return <PhoneButton phone={phone} />
}

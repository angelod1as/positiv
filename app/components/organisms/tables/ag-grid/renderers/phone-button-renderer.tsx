import type { ICellRendererParams } from "ag-grid-community"
import WhatsAppIcon from "~/assets/social/whatsapp.svg"
import { phoneToWhatsAppLink } from "~/lib/helpers/phone-to-whatsapp-link"
import { AGIconButton } from "./ag-icon-button"

export function PhoneButtonRenderer(params: ICellRendererParams) {
  const phone = params.value as number | null | undefined

  if (!phone) return null

  const link = phoneToWhatsAppLink(phone)
  if (!link) return null

  return (
    <AGIconButton
      href={link}
      title="WhatsApp"
      external
      className="border-green-500 hover:border-green-600 hover:bg-green-50"
    >
      <img src={WhatsAppIcon} alt="WhatsApp" className="h-4 w-4" />
    </AGIconButton>
  )
}

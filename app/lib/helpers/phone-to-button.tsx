import type { FC } from "react"
import WhatsAppIcon from "~/assets/social/whatsapp.svg"
import { Button } from "~/components/atoms/button/button"
import { phoneToWhatsAppLink } from "./phone-to-whatsapp-link"

type PhoneButtonProps = { phone: number | null }

export const PhoneButton: FC<PhoneButtonProps> = ({ phone }) => {
  if (!phone) return null
  const link = phoneToWhatsAppLink(phone)
  if (!link) return null
  return (
    <Button
      to={link}
      className="border-green-500 border bg-green-200 text-primary [a&]:hover:bg-green-500/90 shadow"
      linkProps={{ target: "_blank" }}
    >
      <img src={WhatsAppIcon} alt="WhatsApp" width={20} />
    </Button>
  )
}

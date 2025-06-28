import type { FC } from "react"
import WhatsappIcon from "~/assets/social/whatsapp.svg"
import { Button } from "~/components/atoms/button/button"
import { phoneToWhatsappLink } from "./phone-to-whatsapp-link"

type PhoneButtonProps = { phone: number | null }

export const PhoneButton: FC<PhoneButtonProps> = ({ phone }) => {
  if (!phone) return null
  const link = phoneToWhatsappLink(phone)
  if (!link) return null
  return (
    <Button
      to={link}
      className="border-green-500 border bg-green-200 text-primary [a&]:hover:bg-green-500/90 shadow"
      linkProps={{ target: "_blank" }}
    >
      <img src={WhatsappIcon} alt="Whatsapp" width={20} />
    </Button>
  )
}

import WhatsappIcon from "~/assets/social/whatsapp.svg"
import { Button } from "~/components/atoms/button/button"
import { phoneToWhatsappLink } from "./phone-to-whatsapp-link"

export const phoneToButton = (phone: number | null) => {
  if (!phone) return null
  const link = phoneToWhatsappLink(phone)
  if (!link) return null
  return (
    <Button to={link} variant="outline" linkProps={{ target: "_blank" }}>
      <img src={WhatsappIcon} alt="Whatsapp" width={20} />
    </Button>
  )
}

import WhatsAppIcon from "~/assets/social/whatsapp.svg"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { whatsAppButtonCopy } from "~/copy/layout"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"

import { Link } from "../link/link"

export const FloatingWhatsAppButton = () => {
  const message = whatsAppButtonCopy.message
  const whatsappLink = `https://wa.me/${POSITIV_WHATSAPP}?text=${encodeURIComponent(message)}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={whatsAppButtonCopy.ariaLabel}
          className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-white text-white shadow-lg transition-transform hover:scale-110 hover:bg-green sm:bottom-4 sm:right-4"
        >
          <img src={WhatsAppIcon} alt={whatsAppButtonCopy.iconAlt} className="size-7" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <p>{whatsAppButtonCopy.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

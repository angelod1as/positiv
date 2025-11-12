import WhatsappIcon from "~/assets/social/whatsapp.svg"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"

export const FloatingWhatsappButton = () => {
  const message = "Olá! Vim do site e gostaria de saber mais sobre a Positiv"
  const whatsappLink = `https://wa.me/${POSITIV_WHATSAPP}?text=${encodeURIComponent(message)}`

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Fale conosco pelo WhatsApp"
            className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110 hover:bg-green-600 sm:bottom-4 sm:right-4"
          >
            <img src={WhatsappIcon} alt="WhatsApp" className="size-7" />
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>Fale conosco</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

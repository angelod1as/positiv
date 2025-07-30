import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button, type ButtonProps } from "~/components/ui/button"
import {
  formatParticipantNameForGoogleContacts,
  generateGoogleContactsUrl,
  type ProfileForGoogleContacts,
} from "~/lib/helpers/google-contacts"
import { cn } from "~/lib/utils"

type AddToGoogleContactsButtonProps = {
  profile: ProfileForGoogleContacts
  email: string
  phone: string | number | null
} & Omit<ButtonProps, 'onClick'>

export function AddToGoogleContactsButton({
  profile,
  email,
  phone,
  className,
  ...props
}: AddToGoogleContactsButtonProps) {
  const handleClick = async () => {
    const formattedName = formatParticipantNameForGoogleContacts(profile)
    
    try {
      await navigator.clipboard.writeText(formattedName)
      toast.success('Nome copiado! Cole no campo de nome do Google Contacts')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Erro ao copiar nome para a área de transferência')
    }
    
    const googleContactsUrl = generateGoogleContactsUrl(email, phone)
    window.open(googleContactsUrl, '_blank')
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      className={cn("gap-2", className)}
      {...props}
    >
      <UserPlus className="h-4 w-4" />
      Adicionar ao Google Contacts
    </Button>
  )
}
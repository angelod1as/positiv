import { useNavigate } from "react-router"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/atoms/button/button"
import { PROFILE_REQUIREMENTS } from "./profile-update-config"

export const ProfileUpdateModal = () => {
  const navigate = useNavigate()

  const handleUpdateProfile = () => {
    navigate(PROFILE_REQUIREMENTS.targetPath)
  }

  const preventDismiss = (e: Event) => {
    e.preventDefault()
  }

  return (
    <AlertDialog open={true}>
      <AlertDialogContent onEscapeKeyDown={preventDismiss}>
        <AlertDialogHeader>
          <AlertDialogTitle>Atualize seu perfil</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div data-testid="profile-update-description">
              {PROFILE_REQUIREMENTS.message}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="default" onClick={handleUpdateProfile}>
            Atualizar meu perfil
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
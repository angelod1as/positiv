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
import { Copy } from "~/components/atoms/copy/copy"
import { profileUpdateCopy } from "~/copy/account"
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
          <AlertDialogTitle>{profileUpdateCopy.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div data-testid="profile-update-description">
              <div className="space-y-2">
                <Copy>{PROFILE_REQUIREMENTS.message}</Copy>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="default" onClick={handleUpdateProfile}>
            {profileUpdateCopy.cta}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
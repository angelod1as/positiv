import { useNavigate } from "react-router"
import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import { emailConfirmationCopy } from "~/copy/account"
import paths from "~/lib/paths"

export const EmailConfirmationModal = () => {
  const navigate = useNavigate()

  const preventDismiss = (e: Event) => {
    e.preventDefault()
  }

  return (
    <AlertDialog open={true}>
      <AlertDialogContent onEscapeKeyDown={preventDismiss}>
        <AlertDialogHeader>
          <AlertDialogTitle>{emailConfirmationCopy.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <Copy>{emailConfirmationCopy.message}</Copy>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            variant="default"
            onClick={() => void navigate(paths.root.EMAILS)}
          >
            {emailConfirmationCopy.cta}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

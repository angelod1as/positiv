import type { FC, ReactNode } from "react"
import { Button, type ButtonProps } from "~/components/atoms/button/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"

type ConfirmDialogProps = {
  trigger: ButtonProps & {
    label: string
  }
  dialog: {
    title: string
    description: ReactNode
  }
  cancel: ButtonProps & {
    label: string
  }
  confirm?: ButtonProps & {
    label: string
    targetFn: () => void
  }
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({
  trigger: triggerProp,
  dialog,
  cancel: cancelProp,
  confirm: confirmProp,
}) => {
  const { label: triggerLabel, ...trigger } = triggerProp
  const { title, description } = dialog
  const {
    label: cancelLabel,
    variant: cancelVariant = "outline",
    ...cancel
  } = cancelProp
  const {
    label: confirmLabel,
    variant: confirmVariant = "default",
    targetFn,
    ...confirm
  } = confirmProp || {}

  return (
    <AlertDialog>
      <Button asChild {...trigger}>
        <AlertDialogTrigger className="cursor-pointer">
          {triggerLabel}
        </AlertDialogTrigger>
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild={typeof description !== "string"}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button asChild {...cancel} variant={cancelVariant}>
            <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          </Button>
          {confirmProp && (
            <form>
              <Button
                data-testid="dialog-confirm"
                formAction={targetFn}
                type="submit"
                asChild
                {...confirm}
                variant={confirmVariant}
              >
                <AlertDialogAction>{confirmLabel}</AlertDialogAction>
              </Button>
            </form>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ConfirmDialog

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"

import { useState, type FC, type ReactNode } from "react"
import { Button, type ButtonProps } from "~/components/atoms/button/button"

type ConfirmDialogProps = {
  onConfirm?: (closeDialog: () => void) => Promise<void> | void
  onCancel?: () => void
  title?: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
  isLoading?: boolean
}

const ConfirmDialog: FC<ConfirmDialogProps> & {
  Trigger: typeof ConfirmDialogTrigger
} = ({
  onConfirm,
  onCancel,
  title = "Tem certeza?",
  description = "Essa ação não pode ser desfeita.",
  confirmLabel,
  cancelLabel,
  open,
  onOpenChange,
  children,
  isLoading = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = open !== undefined && onOpenChange !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm(() => handleOpenChange?.(false))
    }
  }

  return (
    <AlertDialog
      open={dialogOpen}
      onOpenChange={handleOpenChange}
      data-testid="confirm-dialog"
    >
      {children /* optional trigger */}

      <AlertDialogContent onFocusOutside={() => onOpenChange?.(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription asChild>
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          {cancelLabel && (
            <Button asChild variant="outline" onClick={onCancel}>
              <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
            </Button>
          )}
          {confirmLabel && (
            <Button
              variant="default"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? "⏳ Carregando..." : confirmLabel}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type ConfirmDialogTriggerProps = ButtonProps
const ConfirmDialogTrigger: FC<ConfirmDialogTriggerProps> = (props) => (
  <AlertDialogTrigger asChild>
    <Button {...props} />
  </AlertDialogTrigger>
)

ConfirmDialog.Trigger = ConfirmDialogTrigger

export default ConfirmDialog

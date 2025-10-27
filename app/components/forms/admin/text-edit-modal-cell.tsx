import { PencilIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import type { BaseCellEditorProps } from "./use-cell-editor"

export type TextEditModalCellProps<
  T extends { id: string },
  K extends keyof T,
> = BaseCellEditorProps<T, K> & {
  label?: string
}

const TRUNCATE_LENGTH = 25

export const TextEditModalCell = <T extends { id: string }, K extends keyof T>({
  value,
  rowData,
  field,
  onSave,
  label,
}: TextEditModalCellProps<T, K>) => {
  const [isOpen, setIsOpen] = useState(false)
  const [editedValue, setEditedValue] = useState<string>("")
  const [currentValue, setCurrentValue] = useState(String(value || ""))

  // Update currentValue when the prop changes (e.g., after page refresh)
  useEffect(() => {
    setCurrentValue(String(value || ""))
  }, [value])

  const shouldTruncate = currentValue.length > TRUNCATE_LENGTH

  const handleOpen = () => {
    setEditedValue(currentValue)
    setIsOpen(true)
  }

  const handleClose = async (shouldSave: boolean) => {
    if (shouldSave && editedValue !== currentValue) {
      await onSave(rowData.id, field, editedValue as T[K])
      // Optimistically update display value
      setCurrentValue(editedValue)
    }
    setIsOpen(false)
  }

  const displayText = shouldTruncate
    ? currentValue.slice(0, TRUNCATE_LENGTH) + "..."
    : currentValue

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">{displayText}</span>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleOpen}
                aria-label="Edit text"
              >
                <PencilIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            {currentValue && (
              <TooltipContent>
                <p className="max-w-xs whitespace-pre-wrap">{currentValue}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose(false)}>
        <DialogContent
          aria-describedby={undefined}
          onPointerDownOutside={(e) => {
            e.preventDefault()
            handleClose(false)
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            handleClose(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>{label || "Edit Text"}</DialogTitle>
          </DialogHeader>
          <textarea
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className="min-h-40 w-full rounded border border-gray-300 p-2"
            rows={6}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => handleClose(true)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

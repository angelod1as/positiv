import type { ICellRendererParams } from "ag-grid-community"
import { PencilIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"

const TRUNCATE_LENGTH = 25

export function TextModalEditor(params: ICellRendererParams) {
  const value = params.value as string | null | undefined
  const field = params.colDef?.field
  const label = params.colDef?.headerName

  const [isOpen, setIsOpen] = useState(false)
  const [editedValue, setEditedValue] = useState("")
  const [originalValue, setOriginalValue] = useState("")

  const text = value || ""
  const shouldTruncate = text.length > TRUNCATE_LENGTH
  const displayText = shouldTruncate
    ? text.slice(0, TRUNCATE_LENGTH) + "..."
    : text

  const isDirty = editedValue !== originalValue

  const handleOpen = () => {
    setEditedValue(text)
    setOriginalValue(text)
    setIsOpen(true)
  }

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        "Você tem alterações não salvas. Deseja descartá-las?",
      )
      if (!confirmed) {
        return
      }
    }
    setIsOpen(false)
  }

  const handleSave = () => {
    if (!field) {
      setIsOpen(false)
      return
    }

    // Only save if value actually changed
    if (editedValue === originalValue) {
      setIsOpen(false)
      return
    }

    try {
      // Use AG Grid's setDataValue to trigger auto-save system
      params.node.setDataValue(field, editedValue)
      setIsOpen(false)
    } catch (error) {
      toast.error("Erro ao salvar alteração", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      })
      // Keep modal open on error
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">{displayText}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          aria-label="Edit text"
        >
          <PencilIcon className="size-4" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent
          aria-describedby={undefined}
          onPointerDownOutside={(e) => {
            e.preventDefault()
            handleCancel()
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            handleCancel()
          }}
        >
          <DialogHeader>
            <DialogTitle>{label || "Edit Text"}</DialogTitle>
          </DialogHeader>
          <textarea
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            aria-label={label || "Edit text"}
            className="min-h-40 w-full rounded border border-gray-300 p-2"
            rows={6}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

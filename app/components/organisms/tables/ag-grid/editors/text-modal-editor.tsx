import type { ICellRendererParams } from "ag-grid-community"
import { PencilIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"

const TRUNCATE_LENGTH = 25

interface RowData {
  id: string
  [key: string]: unknown
}

interface TextModalEditorContext {
  onSave?: (id: string, field: string, value: string) => Promise<void>
}

export function TextModalEditor(params: ICellRendererParams) {
  const value = params.value as string | null | undefined
  const data = params.data as RowData | undefined
  const context = params.context as TextModalEditorContext | undefined
  const field = params.colDef?.field
  const label = params.colDef?.headerName

  const [isOpen, setIsOpen] = useState(false)
  const [editedValue, setEditedValue] = useState("")

  const text = value || ""
  const shouldTruncate = text.length > TRUNCATE_LENGTH
  const displayText = shouldTruncate
    ? text.slice(0, TRUNCATE_LENGTH) + "..."
    : text

  const handleOpen = () => {
    setEditedValue(text)
    setIsOpen(true)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  const handleSave = async () => {
    if (context?.onSave && data?.id && field) {
      await context.onSave(data.id, field, editedValue)
    }
    setIsOpen(false)
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

import { useCallback, useRef, useState, useEffect } from "react"
import type { CellValueChangedEvent } from "ag-grid-community"
import { toast } from "sonner"
import type { AutoSaveParams } from "./types"

export interface UseAutoSaveOptions {
  onSave?: (params: AutoSaveParams) => Promise<void>
  debounceMs?: number
  errorMessage?: string
}

export interface UseAutoSaveReturn {
  handleCellValueChanged: (event: CellValueChangedEvent) => void
  isSaving: boolean
}

const DEFAULT_DEBOUNCE_MS = 500
const DEFAULT_ERROR_MESSAGE = "Erro ao salvar alteração"

export function useAutoSave({
  onSave,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  errorMessage = DEFAULT_ERROR_MESSAGE,
}: UseAutoSaveOptions = {}): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pass event directly via closure to avoid race condition with ref
  const executeSave = useCallback(
    async (event: CellValueChangedEvent) => {
      if (!onSave) return

      const field = event.colDef.field || event.column.getColId()
      const params: AutoSaveParams = {
        field,
        oldValue: event.oldValue,
        newValue: event.newValue,
        rowData: event.data,
        rowId: event.node.id,
      }

      setIsSaving(true)

      try {
        await onSave(params)
      } catch (error) {
        // Log error for debugging
        console.error("Auto-save failed:", { error, field, rowId: event.node.id })

        // Rollback to old value
        const nodeId = event.node.id
        if (nodeId) {
          const rowNode = event.api.getRowNode(nodeId)
          if (rowNode) {
            rowNode.setDataValue(field, event.oldValue)
          }
        }
        toast.error(errorMessage)
      } finally {
        setIsSaving(false)
      }
    },
    [onSave, errorMessage]
  )

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      if (!onSave) return

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Set new timer - capture event in closure to avoid race condition
      timerRef.current = setTimeout(() => {
        executeSave(event)
      }, debounceMs)
    },
    [onSave, debounceMs, executeSave]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    handleCellValueChanged,
    isSaving,
  }
}

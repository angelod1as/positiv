import { useCallback, useRef, useState, useEffect } from "react"
import type { CellValueChangedEvent } from "ag-grid-community"
import { toast } from "sonner"

export interface AutoSaveParams {
  field: string
  oldValue: unknown
  newValue: unknown
  rowData: unknown
  rowId: string | undefined
}

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
  const pendingEventRef = useRef<CellValueChangedEvent | null>(null)

  const executeSave = useCallback(async () => {
    const event = pendingEventRef.current
    if (!event || !onSave) return

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
    } catch {
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
      pendingEventRef.current = null
    }
  }, [onSave, errorMessage])

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      if (!onSave) return

      // Store the event for later use
      pendingEventRef.current = event

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Set new timer
      timerRef.current = setTimeout(() => {
        executeSave()
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

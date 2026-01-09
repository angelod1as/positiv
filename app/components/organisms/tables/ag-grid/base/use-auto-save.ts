import { useCallback, useRef, useState, useEffect } from "react"
import type { CellValueChangedEvent, GridApi } from "ag-grid-community"
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
  hasPendingSave: boolean
}

interface SaveSnapshot {
  field: string
  oldValue: unknown
  newValue: unknown
  rowData: unknown
  rowId: string | undefined
  api: GridApi
}

const DEFAULT_DEBOUNCE_MS = 500
const DEFAULT_ERROR_MESSAGE = "Erro ao salvar alteração"

export function useAutoSave({
  onSave,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  errorMessage = DEFAULT_ERROR_MESSAGE,
}: UseAutoSaveOptions = {}): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [hasPendingSave, setHasPendingSave] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const executeSave = useCallback(
    async (snapshot: SaveSnapshot) => {
      if (!onSave) return

      const params: AutoSaveParams = {
        field: snapshot.field,
        oldValue: snapshot.oldValue,
        newValue: snapshot.newValue,
        rowData: snapshot.rowData,
        rowId: snapshot.rowId,
      }

      console.info("[AutoSave] Executing save:", params)
      setHasPendingSave(false)
      setIsSaving(true)

      try {
        await onSave(params)
        console.info("[AutoSave] Save completed successfully")
      } catch (error) {
        console.error("Auto-save failed:", {
          error,
          field: snapshot.field,
          rowId: snapshot.rowId,
        })

        if (!snapshot.rowId) {
          console.warn("Cannot rollback change: node.id is undefined", {
            field: snapshot.field,
          })
        } else {
          const rowNode = snapshot.api.getRowNode(snapshot.rowId)
          const currentValue =
            rowNode?.data?.[snapshot.field as keyof typeof rowNode.data]

          if (rowNode && currentValue === snapshot.newValue) {
            rowNode.setDataValue(snapshot.field, snapshot.oldValue)
          }
        }

        const errorDescription =
          error instanceof Error ? error.message : undefined
        toast.error(errorMessage, { description: errorDescription })
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

      // Snapshot event data to avoid AG Grid reusing/mutating the event object
      const field = event.colDef.field || event.column.getColId()
      const snapshot: SaveSnapshot = {
        field,
        oldValue: event.oldValue,
        newValue: event.newValue,
        rowData: event.data,
        rowId: event.node.id,
        api: event.api,
      }

      console.info("[AutoSave] Cell changed:", {
        field,
        oldValue: event.oldValue,
        newValue: event.newValue,
        rowId: event.node.id,
      })

      setHasPendingSave(true)
      timerRef.current = setTimeout(() => {
        executeSave(snapshot)
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
    hasPendingSave,
  }
}

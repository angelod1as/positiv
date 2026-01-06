import { useCallback, useEffect, useRef, useState } from "react"
import type { GridApi, GridState } from "ag-grid-community"
import type {
  UseGridStateOptions,
  UseGridStateReturn,
  StoredGridState,
} from "./types"

const STORAGE_KEY_PREFIX = "ag-grid-state-"
const DEFAULT_DEBOUNCE_MS = 500

/**
 * Hook for persisting AG Grid state to session storage.
 *
 * Handles saving and restoring grid state (column widths, sort, filters)
 * with automatic versioning for state invalidation when schema changes.
 *
 * @param tableId - Unique identifier for the table (used as storage key)
 * @param options - Configuration options including version number
 * @returns Object with restoreState, saveState, clearState functions and isRestored flag
 *
 * @example
 * ```tsx
 * const { restoreState, saveState } = useGridState('participants-table', { version: 1 })
 *
 * <AGDataTable
 *   onGridReady={(e) => restoreState(e.api)}
 *   onStateUpdated={(e) => saveState(e.state)}
 * />
 * ```
 */
export function useGridState(
  tableId: string,
  options: UseGridStateOptions
): UseGridStateReturn {
  const { version, debounceMs = DEFAULT_DEBOUNCE_MS } = options
  const storageKey = `${STORAGE_KEY_PREFIX}${tableId}`

  const [isRestored, setIsRestored] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup debounce timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const restoreState = useCallback(
    (api: GridApi) => {
      try {
        const storedData = sessionStorage.getItem(storageKey)

        if (!storedData) {
          setIsRestored(true)
          return
        }

        const parsed: StoredGridState = JSON.parse(storedData)

        if (parsed.version !== version) {
          sessionStorage.removeItem(storageKey)
          setIsRestored(true)
          return
        }

        api.setState(parsed.gridState)
        setIsRestored(true)
      } catch (error) {
        // Only clear storage on parse errors, not on api.setState failures
        if (error instanceof SyntaxError) {
          sessionStorage.removeItem(storageKey)
        }
        setIsRestored(true)
      }
    },
    [storageKey, version]
  )

  const saveState = useCallback(
    (state: GridState) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        const dataToStore: StoredGridState = {
          version,
          savedAt: Date.now(),
          gridState: state,
        }

        try {
          sessionStorage.setItem(storageKey, JSON.stringify(dataToStore))
        } catch {
          // Storage full or other error - fail silently
        }
      }, debounceMs)
    },
    [storageKey, version, debounceMs]
  )

  const clearState = useCallback(() => {
    // Cancel any pending debounced save to prevent race condition
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    sessionStorage.removeItem(storageKey)
  }, [storageKey])

  return {
    restoreState,
    saveState,
    clearState,
    isRestored,
  }
}

import { composable } from "composable-functions"
import type { FetcherWithComponents } from "react-router"
import type { ComposableFetcherData } from "~types/database/entities.types"

type SaveHandlerConfig<T extends { id: string }> = {
  data: T[]
  fetcher: FetcherWithComponents<ComposableFetcherData>
  intent: string
  getRequiredFields?: (item: T) => Record<string, string>
}

/**
 * Creates a generic save handler for table cell editing.
 *
 * This factory function generates a save handler that:
 * - Finds the item being edited
 * - Optimistically updates the local state
 * - Submits FormData with required fields to server for validation
 * - Handles boolean values specially
 * - Rolls back on server error
 *
 * Note: All validation is handled server-side via Zod schemas in action handlers.
 * This ensures errors flow through fetcher.data → sendToast → toast.error().
 *
 * @param config - Configuration object
 * @returns A save handler function for use with cell editors
 *
 * @example
 * ```tsx
 * const handleSave = createSaveHandler({
 *   data: participants,
 *   fetcher,
 *   intent: "update-event-participant",
 *   getRequiredFields: (p) => ({ profile_id: p.profile_id || "" }),
 * })
 *
 * // Use with cell editors
 * <SelectCellEditor
 *   value={row.status}
 *   field="status"
 *   onSave={handleSave}
 *   options={statusOptions}
 * />
 * ```
 */
export function createSaveHandler<T extends { id: string }>(
  config: SaveHandlerConfig<T>,
) {
  return async <K extends keyof T>(
    id: string,
    field: K,
    value: T[K],
  ): Promise<void> => {
    const item = config.data.find((item) => item.id === id)
    if (!item) return

    const originalValue = item[field]
    item[field] = value

    const result = await composable(async () => {
      const formData = new FormData()
      formData.append("intent", config.intent)
      formData.append("id", id)

      // Add required fields
      const requiredFields = config.getRequiredFields?.(item) ?? {}
      Object.entries(requiredFields).forEach(([key, val]) => {
        formData.append(key, val)
      })

      // Add the field being updated
      if (value !== undefined && value !== null) {
        // Handle boolean values specially
        if (typeof value === "boolean") {
          formData.append(field as string, value ? "true" : "false")
        } else {
          formData.append(field as string, String(value))
        }
      }

      return await config.fetcher.submit(formData, { method: "post" })
    })()

    if (!result.success) {
      item[field] = originalValue
      throw new Error("Ops, algo deu errado ao salvar seu valor")
    }
  }
}

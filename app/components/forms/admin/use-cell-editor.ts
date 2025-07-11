import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"

export type BaseCellEditorProps<T extends { id: string }, K extends keyof T> = {
  value: T[K]
  rowData: T
  field: K
  onSave: (id: string, field: K, value: T[K]) => void
}

export const useCellEditor = <T extends { id: string }, K extends keyof T>({
  value,
  rowData,
  field,
  onSave,
}: BaseCellEditorProps<T, K>) => {
  const [isSaving, setIsSaving] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    watch,
    formState: { errors, isDirty },
  } = useForm<Record<string, unknown>>({
    defaultValues: {
      [field as string]: value,
    },
    mode: "onChange",
  })

  const watchedValue = watch(field as string)

  // Auto-save when value changes
  useEffect(() => {
    // Don't save on initial render
    if (!isDirty) return

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set a new timeout for debouncing
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Call the parent save function
        onSave(rowData.id, field, watchedValue as T[K])
      } catch (error) {
        console.error("Error saving data:", error)
      } finally {
        setIsSaving(false)
        timeoutRef.current = null
      }
    }, 500)

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [watchedValue, isDirty, field, onSave, rowData.id])

  return {
    register,
    errors,
    isSaving,
  }
}

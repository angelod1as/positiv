import { useEffect, useState, useCallback, useRef } from "react"
import type { ZodObject, ZodRawShape } from "zod"
import type { FetcherWithComponents } from "react-router"
import { toast } from "sonner"
import type { ComposableFetcherData } from "~types/database/entities.types"
import { z } from "zod"

export interface UseAutoSaveFormOptions<T extends ZodRawShape> {
  schema: ZodObject<T>
  initialData: z.infer<ZodObject<T>>
  fetcher: FetcherWithComponents<ComposableFetcherData>
  onSubmit: (field: string, value: unknown) => void
  successMessage?: string
  errorMessage?: string
}

export interface FieldState {
  isDirty: boolean
  isSaving: boolean
  error: string | null
}

export interface UseAutoSaveFormReturn<T> {
  values: T
  register: {
    select: (
      name: keyof T,
    ) => { value: string; onValueChange: (value: string) => void }
    checkbox: (
      name: keyof T,
    ) => { checked: boolean; onChange: (e: { target: { checked: boolean } }) => void }
    text: (
      name: keyof T,
    ) => {
      value: string
      onChange: (e: { target: { value: string } }) => void
      onBlur: () => void
    }
    number: (
      name: keyof T,
    ) => {
      value: string
      onChange: (e: { target: { value: string } }) => void
      onBlur: () => void
    }
  }
  isSaving: boolean
  getFieldState: (name: keyof T) => FieldState
  setValue: (name: keyof T, value: unknown) => void
  submitField: (name: keyof T) => void
}

export function useAutoSaveForm<T extends ZodRawShape>(
  options: UseAutoSaveFormOptions<T>,
): UseAutoSaveFormReturn<z.infer<ZodObject<T>>> {
  type FormValues = z.infer<ZodObject<T>>
  const {
    schema,
    initialData,
    fetcher,
    onSubmit,
    successMessage = "Dados atualizados com sucesso",
    errorMessage = "Erro ao salvar",
  } = options

  const [values, setValues] = useState<FormValues>(initialData)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>(
    {},
  )
  const initialDataRef = useRef(initialData)
  const previousFetcherDataRef = useRef<ComposableFetcherData | undefined>(
    undefined,
  )

  // Normalize null/undefined/empty string for comparison to avoid unnecessary saves
  const normalizeForComparison = (value: unknown): string => {
    if (value === null || value === undefined) return ""
    return String(value)
  }

  // Re-sync values when initialData changes (prop sync)
  // Use JSON comparison since initialData is often an object literal
  useEffect(() => {
    const currentJson = JSON.stringify(initialData)
    const prevJson = JSON.stringify(initialDataRef.current)
    if (currentJson !== prevJson) {
      setValues(initialData)
      initialDataRef.current = initialData
    }
  }, [initialData])

  // Show toast feedback when fetcher.data changes and reset baseline on success
  useEffect(() => {
    if (fetcher.data && fetcher.data !== previousFetcherDataRef.current) {
      if (fetcher.data.success) {
        toast.success(successMessage)
        // Reset baseline to current values after successful save
        initialDataRef.current = values
      } else {
        const errorMsg =
          fetcher.data.errors?._global?.[0] ?? errorMessage
        toast.error(errorMsg)
      }
    }
    previousFetcherDataRef.current = fetcher.data
  }, [fetcher.data, successMessage, errorMessage, values])

  const isSaving = fetcher.state !== "idle"

  const setValue = useCallback((name: keyof FormValues, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const doSubmit = useCallback(
    (name: keyof FormValues, value: unknown) => {
      const fieldName = String(name)

      // Validate the field value against the schema
      const fieldSchema = schema.shape[fieldName] as z.ZodType | undefined
      if (fieldSchema) {
        const result = fieldSchema.safeParse(value)
        if (!result.success) {
          const validationErrorMsg =
            result.error.issues[0]?.message ?? "Valor inválido"
          setFieldErrors((prev) => ({ ...prev, [fieldName]: validationErrorMsg }))
          toast.error(validationErrorMsg)
          return
        }
      }

      // Clear any previous error for this field
      setFieldErrors((prev) => ({ ...prev, [fieldName]: null }))

      onSubmit(fieldName, value)
    },
    [onSubmit, schema],
  )

  const submitField = useCallback(
    (name: keyof FormValues) => {
      doSubmit(name, values[name])
    },
    [doSubmit, values],
  )

  const getFieldState = useCallback(
    (name: keyof FormValues): FieldState => {
      const fieldName = String(name)
      const currentValue = normalizeForComparison(values[name])
      const originalValue = normalizeForComparison(initialDataRef.current[name])
      const isDirty = currentValue !== originalValue

      return {
        isDirty,
        isSaving,
        error: fieldErrors[fieldName] ?? null,
      }
    },
    [values, isSaving, fieldErrors],
  )

  const register = {
    select: (name: keyof FormValues) => ({
      value: String(values[name] ?? ""),
      onValueChange: (value: string) => {
        setValues((prev) => ({ ...prev, [name]: value }))
        doSubmit(name, value)
      },
    }),
    checkbox: (name: keyof FormValues) => ({
      checked: Boolean(values[name]),
      onChange: (e: { target: { checked: boolean } }) => {
        const newValue = e.target.checked
        setValues((prev) => ({ ...prev, [name]: newValue }))
        doSubmit(name, newValue)
      },
    }),
    text: (name: keyof FormValues) => ({
      value: String(values[name] ?? ""),
      onChange: (e: { target: { value: string } }) => {
        setValues((prev) => ({ ...prev, [name]: e.target.value }))
      },
      onBlur: () => {
        const currentValue = normalizeForComparison(values[name])
        const originalValue = normalizeForComparison(initialDataRef.current[name])
        if (currentValue !== originalValue) {
          doSubmit(name, currentValue)
        }
      },
    }),
    number: (name: keyof FormValues) => ({
      value: String(values[name] ?? ""),
      onChange: (e: { target: { value: string } }) => {
        setValues((prev) => ({ ...prev, [name]: e.target.value }))
      },
      onBlur: () => {
        const currentValue = normalizeForComparison(values[name])
        const originalValue = normalizeForComparison(initialDataRef.current[name])
        if (currentValue !== originalValue) {
          // Coerce to number for proper type submission
          const numValue = currentValue === "" ? 0 : Number(currentValue)
          doSubmit(name, isNaN(numValue) ? currentValue : numValue)
        }
      },
    }),
  }

  return {
    values,
    register,
    isSaving,
    getFieldState,
    setValue,
    submitField,
  }
}

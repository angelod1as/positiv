import { useEffect, useState, useCallback, useRef } from "react"
import type { ZodObject, ZodRawShape } from "zod"
import type { FetcherWithComponents } from "react-router"
import { toast } from "sonner"
import type { ComposableFetcherData } from "~types/database/entities.types"
import type { z } from "zod"

export interface UseAutoSaveFormOptions<T extends ZodRawShape> {
  schema: ZodObject<T>
  initialData: z.infer<ZodObject<T>>
  fetcher: FetcherWithComponents<ComposableFetcherData>
  onSubmit: (field: string, value: unknown, formData: FormData) => void
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
    initialData,
    fetcher,
    onSubmit,
    successMessage = "Dados atualizados com sucesso",
    errorMessage = "Erro ao salvar",
  } = options

  const [values, setValues] = useState<FormValues>(initialData)
  const initialDataRef = useRef(initialData)
  const previousFetcherDataRef = useRef<ComposableFetcherData | undefined>(
    undefined,
  )

  // Re-sync values when initialData changes (prop sync)
  useEffect(() => {
    if (initialData !== initialDataRef.current) {
      setValues(initialData)
      initialDataRef.current = initialData
    }
  }, [initialData])

  // Show toast feedback when fetcher.data changes
  useEffect(() => {
    if (fetcher.data && fetcher.data !== previousFetcherDataRef.current) {
      if (fetcher.data.success) {
        toast.success(successMessage)
      } else {
        const errorMsg =
          fetcher.data.errors?._global?.[0] ?? errorMessage
        toast.error(errorMsg)
      }
    }
    previousFetcherDataRef.current = fetcher.data
  }, [fetcher.data, successMessage, errorMessage])

  const isSaving = fetcher.state !== "idle"

  const setValue = useCallback((name: keyof FormValues, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const doSubmit = useCallback(
    (name: keyof FormValues, value: unknown) => {
      const formData = new FormData()
      formData.set(String(name), String(value))
      onSubmit(String(name), value, formData)
    },
    [onSubmit],
  )

  const submitField = useCallback(
    (name: keyof FormValues) => {
      doSubmit(name, values[name])
    },
    [doSubmit, values],
  )

  const getFieldState = useCallback((_name: keyof FormValues): FieldState => {
    return {
      isDirty: false,
      isSaving: false,
      error: null,
    }
  }, [])

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
        const currentValue = String(values[name] ?? "")
        const originalValue = String(initialDataRef.current[name] ?? "")
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
        const currentValue = String(values[name] ?? "")
        const originalValue = String(initialDataRef.current[name] ?? "")
        if (currentValue !== originalValue) {
          doSubmit(name, currentValue)
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

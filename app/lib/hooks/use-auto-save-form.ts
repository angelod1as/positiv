import { useEffect, useState, useCallback, useRef } from "react"
import type { ZodObject, ZodRawShape } from "zod"
import type { FetcherWithComponents } from "react-router"
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
  type FormData = z.infer<ZodObject<T>>
  const { initialData, fetcher } = options

  const [values, setValues] = useState<FormData>(initialData)
  const initialDataRef = useRef(initialData)

  // Re-sync values when initialData changes (prop sync)
  useEffect(() => {
    if (initialData !== initialDataRef.current) {
      setValues(initialData)
      initialDataRef.current = initialData
    }
  }, [initialData])

  const isSaving = fetcher.state !== "idle"

  const setValue = useCallback((name: keyof FormData, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const submitField = useCallback((_name: keyof FormData) => {
    // Will be implemented in next TDD cycle
  }, [])

  const getFieldState = useCallback((_name: keyof FormData): FieldState => {
    return {
      isDirty: false,
      isSaving: false,
      error: null,
    }
  }, [])

  const register = {
    select: (_name: keyof FormData) => ({
      value: "" as string,
      onValueChange: (_value: string) => {},
    }),
    checkbox: (_name: keyof FormData) => ({
      checked: false,
      onChange: (_e: { target: { checked: boolean } }) => {},
    }),
    text: (_name: keyof FormData) => ({
      value: "" as string,
      onChange: (_e: { target: { value: string } }) => {},
      onBlur: () => {},
    }),
    number: (_name: keyof FormData) => ({
      value: "" as string,
      onChange: (_e: { target: { value: string } }) => {},
      onBlur: () => {},
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

import { useEffect, useCallback, useRef, useState } from "react"
import type { ZodObject, ZodRawShape } from "zod"
import type { FetcherWithComponents } from "react-router"
import { toast } from "sonner"
import type { ComposableFetcherData } from "~types/database/entities.types"
import { z } from "zod"
import { useForm, type DefaultValues, type Path, type PathValue } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

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

  const form = useForm<FormValues>({
    // Type assertion needed: zodResolver's generic constraints don't align with
    // ZodRawShape-based inference. The resolver works correctly at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: initialData as DefaultValues<FormValues>,
    mode: "onBlur",
  })

  const {
    setValue: rhfSetValue,
    getValues,
    watch,
    reset,
    formState: { dirtyFields },
  } = form

  const values = watch()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({})
  const initialDataRef = useRef(initialData)
  const previousFetcherDataRef = useRef<ComposableFetcherData | undefined>(
    undefined,
  )

  useEffect(() => {
    const currentJson = JSON.stringify(initialData)
    const prevJson = JSON.stringify(initialDataRef.current)
    if (currentJson !== prevJson) {
      reset(initialData as DefaultValues<FormValues>)
      initialDataRef.current = initialData
    }
  }, [initialData, reset])

  useEffect(() => {
    if (fetcher.data && fetcher.data !== previousFetcherDataRef.current) {
      if (fetcher.data.success) {
        toast.success(successMessage)
        reset(getValues() as DefaultValues<FormValues>)
      } else {
        const errorMsg =
          fetcher.data.errors?._global?.[0] ?? errorMessage
        toast.error(errorMsg)
      }
    }
    previousFetcherDataRef.current = fetcher.data
  }, [fetcher.data, successMessage, errorMessage, getValues, reset])

  const isSaving = fetcher.state !== "idle"

  const setValue = useCallback(
    (name: keyof FormValues, value: unknown) => {
      rhfSetValue(
        name as Path<FormValues>,
        value as PathValue<FormValues, Path<FormValues>>,
        { shouldDirty: true },
      )
    },
    [rhfSetValue],
  )

  const doSubmit = useCallback(
    (name: keyof FormValues, value: unknown) => {
      const fieldName = String(name)

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

      setFieldErrors((prev) => ({ ...prev, [fieldName]: null }))
      onSubmit(fieldName, value)
    },
    [onSubmit, schema],
  )

  const submitField = useCallback(
    (name: keyof FormValues) => {
      const currentValue = getValues(name as Path<FormValues>)
      doSubmit(name, currentValue)
    },
    [doSubmit, getValues],
  )

  const getFieldState = useCallback(
    (name: keyof FormValues): FieldState => {
      const fieldName = String(name)
      const isDirty = Boolean(dirtyFields[fieldName as keyof typeof dirtyFields])

      return {
        isDirty,
        isSaving,
        error: fieldErrors[fieldName] ?? null,
      }
    },
    [dirtyFields, isSaving, fieldErrors],
  )

  const register = {
    select: (name: keyof FormValues) => ({
      value: String(values[name] ?? ""),
      onValueChange: (value: string) => {
        rhfSetValue(
          name as Path<FormValues>,
          value as PathValue<FormValues, Path<FormValues>>,
          { shouldDirty: true },
        )
        doSubmit(name, value)
      },
    }),
    checkbox: (name: keyof FormValues) => ({
      checked: Boolean(values[name]),
      onChange: (e: { target: { checked: boolean } }) => {
        const newValue = e.target.checked
        rhfSetValue(
          name as Path<FormValues>,
          newValue as PathValue<FormValues, Path<FormValues>>,
          { shouldDirty: true },
        )
        doSubmit(name, newValue)
      },
    }),
    text: (name: keyof FormValues) => ({
      value: String(values[name] ?? ""),
      onChange: (e: { target: { value: string } }) => {
        rhfSetValue(
          name as Path<FormValues>,
          e.target.value as PathValue<FormValues, Path<FormValues>>,
          { shouldDirty: true },
        )
      },
      onBlur: () => {
        if (dirtyFields[name as keyof typeof dirtyFields]) {
          const currentValue = String(values[name] ?? "")
          doSubmit(name, currentValue)
        }
      },
    }),
    number: (name: keyof FormValues) => ({
      value: String(values[name] ?? ""),
      onChange: (e: { target: { value: string } }) => {
        rhfSetValue(
          name as Path<FormValues>,
          e.target.value as PathValue<FormValues, Path<FormValues>>,
          { shouldDirty: true },
        )
      },
      onBlur: () => {
        if (dirtyFields[name as keyof typeof dirtyFields]) {
          const currentValue = String(values[name] ?? "")
          if (currentValue === "") {
            doSubmit(name, 0)
            return
          }
          const numValue = Number(currentValue)
          if (isNaN(numValue)) {
            const fieldName = String(name)
            setFieldErrors((prev) => ({ ...prev, [fieldName]: "Valor numérico inválido" }))
            toast.error("Valor numérico inválido")
            return
          }
          doSubmit(name, numValue)
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

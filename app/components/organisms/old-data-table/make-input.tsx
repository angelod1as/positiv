import type { CellContext } from "@tanstack/react-table"
import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import { Select } from "~/components/forms/select"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { useDebounceFunction } from "~/hooks/use-debounce"

type InputType = "text" | "checkbox" | "select" | "money"

interface MakeInputOptions {
  type?: InputType
  selectOptions?: Array<{ value: string; label: string }>
  disabled?: boolean
  submitObject: Record<string, unknown>
}

export const makeInput = <TCtx,>(
  ctx: CellContext<TCtx, unknown>,
  options: MakeInputOptions,
) => {
  const {
    type = "text",
    disabled = false,
    selectOptions,
    submitObject,
  } = options

  const initialValue = ctx.getValue()
  const columnDef = ctx.column.columnDef
  const accessorKey =
    "accessorKey" in columnDef ? columnDef.accessorKey : undefined

  if (!accessorKey) return undefined

  const property = accessorKey as string

  // Use local state for immediate UI updates
  const [value, setValue] = useState(() => {
    if (type === "checkbox") return !!initialValue
    return initialValue || ""
  })

  const fetcher = useFetcher()

  useEffect(() => {
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
      console.error(fetcher.data.error)
    }
  }, [fetcher.data])

  // Use our debounce hook to debounce only the form submission
  const debouncedSubmit = useDebounceFunction(
    (newValue: string | boolean) => {
      fetcher.submit(
        {
          ...submitObject,
          property,
          value: newValue.toString(),
        },
        { method: "POST" },
      )
      toast.success("Atualização efetuada com sucesso")
    },
    500, // 500ms debounce delay
  )

  // Property-specific disable conditions

  // Checkbox rendering
  if (type === "checkbox") {
    return (
      <Checkbox
        className="self-center"
        checked={value as boolean}
        disabled={disabled}
        onChange={(e) => {
          const newValue = e.target.checked
          setValue(newValue)
          debouncedSubmit(newValue)
        }}
      />
    )
  }

  // Select rendering
  if (type === "select" && selectOptions) {
    return (
      <Select
        className="w-auto"
        value={value as string}
        disabled={disabled}
        onChange={(newValue) => {
          setValue(newValue.target.value)
          debouncedSubmit(newValue.target.value)
        }}
      >
        {selectOptions?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    )
  }

  if (type === "money") {
    return (
      <div className="flex gap-1 justify-center items-center">
        <span className="text-xs text-muted-foreground">R$</span>
        <Input
          value={value as string}
          disabled={disabled}
          onChange={(e) => {
            const newValue = e.target.value
            setValue(newValue)
            debouncedSubmit(newValue)
          }}
        />
      </div>
    )
  }

  // Text input rendering (default)
  return (
    <Input
      value={value as string}
      disabled={disabled}
      onChange={(e) => {
        const newValue = e.target.value
        setValue(newValue)
        debouncedSubmit(newValue)
      }}
    />
  )
}

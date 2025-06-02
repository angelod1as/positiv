import type { CellContext } from "@tanstack/react-table"
import { useState } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { useDebounceFunction } from "~/hooks/use-debounce"

type InputType = "text" | "checkbox" | "select"

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
  const { type = "text", disabled = false } = options

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

  // Use our debounce hook to debounce only the form submission
  const debouncedSubmit = useDebounceFunction(
    (newValue: string | boolean) => {
      fetcher.submit(
        {
          ...options.submitObject,
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

  // // Select rendering
  // if (type === 'select') {
  //   return (
  //     <Select
  //       value={value as string}
  //       disabled={disabled}
  //       onChange={(newValue) => {
  //         setValue(newValue)
  //         debouncedSubmit(newValue)
  //       }}
  //     >
  //       {selectOptions.map(option => (
  //         <SelectOption key={option.value} value={option.value}>
  //           {option.label}
  //         </SelectOption>
  //       ))}
  //     </Select>
  //   )
  // }

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

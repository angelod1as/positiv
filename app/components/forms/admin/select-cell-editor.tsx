import { SavingIndicator } from "./base-cell-editor"
import type { BaseCellEditorProps } from "./use-cell-editor"
import { useCellEditor } from "./use-cell-editor"

export type SelectOption = {
  label: string
  value: string
}

export type SelectCellEditorProps<
  T extends { id: string | number },
  K extends keyof T,
> = BaseCellEditorProps<T, K> & {
  options: SelectOption[]
}

export const SelectCellEditor = <
  T extends { id: string | number },
  K extends keyof T,
>({
  value,
  rowData,
  field,
  onSave,
  options,
}: SelectCellEditorProps<T, K>) => {
  const { register, errors, isSaving } = useCellEditor({
    value,
    rowData,
    field,
    onSave,
  })

  return (
    <div className="relative w-full">
      <select
        {...register(field as string, { required: true })}
        className={`w-full p-2 border rounded text-ellipsis ${
          errors[field as string] ? "border-red-500" : "border-gray-300"
        }`}
        style={{ textOverflow: "ellipsis" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isSaving && <SavingIndicator />}
    </div>
  )
}

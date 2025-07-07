import { SavingIndicator } from "./base-cell-editor"
import type { BaseCellEditorProps } from "./use-cell-editor"
import { useCellEditor } from "./use-cell-editor"

export type TextCellEditorProps<
  T extends { id: string },
  K extends keyof T,
> = BaseCellEditorProps<T, K>

export const TextCellEditor = <T extends { id: string }, K extends keyof T>({
  value,
  rowData,
  field,
  onSave,
}: TextCellEditorProps<T, K>) => {
  const { register, errors, isSaving } = useCellEditor({
    value,
    rowData,
    field,
    onSave,
  })

  return (
    <div className="relative">
      <input
        type="text"
        {...register(field as string, { required: true })}
        className={`w-full p-2 border rounded ${
          errors[field as string] ? "border-red-500" : "border-gray-300"
        }`}
      />
      {isSaving && <SavingIndicator />}
    </div>
  )
}

import { SavingIndicator } from "./base-cell-editor"
import type { BaseCellEditorProps } from "./use-cell-editor"
import { useCellEditor } from "./use-cell-editor"

export type CheckboxCellEditorProps<
  T extends { id: string },
  K extends keyof T,
> = BaseCellEditorProps<T, K> & {
  disabled?: boolean
}

export const CheckboxCellEditor = <
  T extends { id: string },
  K extends keyof T,
>({
  value,
  rowData,
  field,
  onSave,
  disabled,
}: CheckboxCellEditorProps<T, K>) => {
  const { register, isSaving } = useCellEditor({
    value,
    rowData,
    field,
    onSave,
  })

  return (
    <div className="relative flex items-center">
      <input
        type="checkbox"
        {...register(field as string)}
        defaultChecked={value as boolean}
        className="w-4 h-4"
        disabled={disabled}
      />
      {isSaving && <SavingIndicator />}
    </div>
  )
}

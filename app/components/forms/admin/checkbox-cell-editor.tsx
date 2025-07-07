import type { BaseCellEditorProps } from "./use-cell-editor"
import { useCellEditor } from "./use-cell-editor"

export type CheckboxCellEditorProps<
  T extends { id: string | number },
  K extends keyof T,
> = BaseCellEditorProps<T, K>

export const CheckboxCellEditor = <
  T extends { id: string | number },
  K extends keyof T,
>({
  value,
  rowData,
  field,
  onSave,
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
        defaultChecked={Boolean(value)}
        className="w-4 h-4"
      />
      {/* Why not SavingIndicator component? */}
      {isSaving && (
        <span className="ml-2 h-4 w-4">
          <span className="animate-ping absolute h-4 w-4 rounded-full bg-blue-400 opacity-75" />
          <span className="absolute h-4 w-4 rounded-full bg-blue-500" />
        </span>
      )}
    </div>
  )
}

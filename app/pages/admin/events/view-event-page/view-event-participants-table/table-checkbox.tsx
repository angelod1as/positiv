import { Checkbox, type CheckboxChangeEvent } from "primereact/checkbox"
import { type ColumnEditorOptions } from "primereact/column"

type TableCheckboxProps = {
  value: ColumnEditorOptions["value"]
  editorCallback?: ColumnEditorOptions["editorCallback"]
  disabled?: boolean
}
export const TableCheckbox = ({
  value,
  editorCallback,
  disabled,
}: TableCheckboxProps) => {
  // console.log('value',value)
  return (
    <Checkbox
      checked={value}
      onChange={(e: CheckboxChangeEvent) => editorCallback?.(e.checked)}
      disabled={disabled}
    />
  )
}

import { type ColumnEditorOptions } from "primereact/column"
import { Dropdown, type DropdownChangeEvent } from "primereact/dropdown"

import type { SelectItemOptionsType } from "primereact/selectitem"

type InputNumberCompoProps = {
  value: ColumnEditorOptions["value"]
  editorCallback?: ColumnEditorOptions["editorCallback"]
  options: SelectItemOptionsType
}
export const TableInputDropdown = ({
  value,
  editorCallback,
  options,
}: InputNumberCompoProps) => {
  return (
    <Dropdown
      value={value}
      onChange={(e: DropdownChangeEvent) => editorCallback?.(e.value)}
      options={options}
    />
  )
}

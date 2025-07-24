import {
  type ColumnEditorOptions,
  type ColumnFilterElementTemplateOptions,
} from "primereact/column"
import { Dropdown, type DropdownChangeEvent } from "primereact/dropdown"

import type { SelectItemOptionsType } from "primereact/selectitem"

type TableInputDropdownProps = {
  value: ColumnEditorOptions["value"]
  options: SelectItemOptionsType
  editorCallback?: ColumnEditorOptions["editorCallback"]
  filterCallback?: ColumnFilterElementTemplateOptions["filterCallback"]
  showClear?: boolean
  index?: number
  placeholder?: string
  className?: string
}
export const TableInputDropdown = ({
  value,
  editorCallback,
  options,
  index,
  filterCallback,
  showClear,
  placeholder,
  className,
}: TableInputDropdownProps) => {
  return (
    <Dropdown
      value={value}
      onChange={(e: DropdownChangeEvent) => {
        editorCallback?.(e.value)
        filterCallback?.(e.value, index)
      }}
      options={options}
      showClear={showClear}
      placeholder={placeholder}
      className={className}
    />
  )
}

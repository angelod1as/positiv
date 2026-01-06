import { useState, useCallback } from "react"
import { useGridFilter } from "ag-grid-react"
import type { IRowNode } from "ag-grid-community"
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "~/components/ui/command"
import { Checkbox } from "~/components/ui/checkbox"
import { Button } from "~/components/ui/button"

interface BaseMultiSelectFilterProps {
  /** Filter options to display */
  options: Array<{ value: string; label: string }>
  /** Field name to extract value from row data (alternative to getValue) */
  field?: string
  /** Custom function to extract value from row (alternative to field) */
  getValue?: (node: IRowNode) => unknown
  /** Controlled model state (optional - uses internal state if not provided) */
  model?: string[] | null
  /** Callback when model changes (optional - uses internal state if not provided) */
  onModelChange?: (model: string[] | null) => void
  placeholder?: string
  selectAllLabel?: string
  clearLabel?: string
  noResultsLabel?: string
}

export function BaseMultiSelectFilter({
  options,
  field,
  getValue: getValueProp,
  model: controlledModel,
  onModelChange: controlledOnModelChange,
  placeholder = "Buscar...",
  selectAllLabel = "Selecionar Todos",
  clearLabel = "Limpar",
  noResultsLabel = "Nenhum resultado",
}: BaseMultiSelectFilterProps) {
  // Internal state for uncontrolled mode (when used directly via filterParams)
  const [internalModel, setInternalModel] = useState<string[] | null>(null)

  // Use controlled or internal state
  const model = controlledModel !== undefined ? controlledModel : internalModel
  const onModelChange = controlledOnModelChange ?? setInternalModel

  // Create getValue from field prop if getValue not provided
  const getValue = useCallback(
    (node: IRowNode) => {
      if (getValueProp) return getValueProp(node)
      if (field) return node.data?.[field]
      return undefined
    },
    [getValueProp, field]
  )

  const selectedValues = model || []

  const doesFilterPass = useCallback(
    ({ node }: { node: IRowNode }) => {
      const values = model || []
      if (values.length === 0) return true
      const cellValue = getValue(node)
      if (cellValue === null || cellValue === undefined) return false
      return values.includes(String(cellValue))
    },
    [model, getValue]
  )

  useGridFilter({ doesFilterPass })

  const handleToggle = (value: string) => {
    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value]
    onModelChange(newSelected.length > 0 ? newSelected : null)
  }

  const handleSelectAll = () => {
    onModelChange(options.map((o) => o.value))
  }

  const handleClear = () => {
    onModelChange(null)
  }

  return (
    <div className="ag-custom-component-popup w-64 bg-popover border rounded-md shadow-md">
      <Command>
        <CommandInput
          placeholder={placeholder}
          aria-label="Buscar opções de filtro"
        />
        <div className="flex gap-2 p-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            type="button"
          >
            {selectAllLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            type="button"
          >
            {clearLabel}
          </Button>
        </div>
        <CommandList>
          <CommandEmpty>{noResultsLabel}</CommandEmpty>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.label}
              onSelect={() => handleToggle(option.value)}
            >
              <Checkbox
                checked={selectedValues.includes(option.value)}
                aria-hidden="true"
                tabIndex={-1}
              />
              <span className="ml-2">{option.label}</span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
      <div className="text-xs text-muted-foreground p-2 border-t">
        {selectedValues.length} de {options.length} selecionados
      </div>
    </div>
  )
}

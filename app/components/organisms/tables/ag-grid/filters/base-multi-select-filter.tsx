import { useState, useCallback, useMemo } from "react"
import { useGridFilter } from "ag-grid-react"
import type { GridApi, IRowNode } from "ag-grid-community"
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
  /** How to match values: 'exact' for single values, 'array' for array fields (gender/orientation) */
  matchMode?: "exact" | "array"
  /** Only show options that exist in the data (default: true) */
  filterToExistingValues?: boolean
  /** Grid API - passed automatically by AG Grid */
  api?: GridApi
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
  matchMode = "exact",
  filterToExistingValues = true,
  api,
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
    [getValueProp, field],
  )

  // Filter options to only show values that exist in the data
  const filteredOptions = useMemo(() => {
    if (!filterToExistingValues || !api) return options

    const existingValues = new Set<string>()
    api.forEachNode((node) => {
      const value = getValue(node)
      if (value !== null && value !== undefined) {
        if (matchMode === "array" && Array.isArray(value)) {
          value.forEach((v) => {
            if (v !== null && v !== undefined) {
              existingValues.add(String(v).toLowerCase())
            }
          })
        } else {
          existingValues.add(String(value).toLowerCase())
        }
      }
    })

    return options.filter((opt) =>
      existingValues.has(opt.value.toLowerCase()),
    )
  }, [api, options, getValue, matchMode, filterToExistingValues])

  const selectedValues = model || []

  const doesFilterPass = useCallback(
    ({ node }: { node: IRowNode }) => {
      const values = model || []
      if (values.length === 0) return true
      const cellValue = getValue(node)
      if (cellValue === null || cellValue === undefined) return false

      if (matchMode === "array") {
        if (!Array.isArray(cellValue) || cellValue.length === 0) return false
        const normalizedCellValues = new Set(
          cellValue
            .filter((v): v is NonNullable<typeof v> => v !== null && v !== undefined)
            .map((v) => String(v).toLowerCase())
        )
        return values.some((selected) =>
          normalizedCellValues.has(selected.toLowerCase())
        )
      }

      const normalizedCellValue = String(cellValue).toLowerCase()
      return values.some((v) => v.toLowerCase() === normalizedCellValue)
    },
    [model, getValue, matchMode]
  )

  useGridFilter({ doesFilterPass })

  const handleToggle = (value: string) => {
    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value]
    onModelChange(newSelected.length > 0 ? newSelected : null)
  }

  const handleSelectAll = () => {
    onModelChange(filteredOptions.map((o) => o.value))
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
          {filteredOptions.map((option) => (
            <CommandItem
              key={option.value}
              value={option.label}
              onSelect={() => handleToggle(option.value)}
            >
              <Checkbox
                checked={selectedValues.includes(option.value)}
                aria-hidden="true"
                tabIndex={-1}
                readOnly
              />
              <span className="ml-2">{option.label}</span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
      <div className="text-xs text-muted-foreground p-2 border-t">
        {selectedValues.length} de {filteredOptions.length} selecionados
      </div>
    </div>
  )
}

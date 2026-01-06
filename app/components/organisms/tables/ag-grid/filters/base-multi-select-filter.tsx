import { useCallback } from "react"
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
  model: string[] | null
  onModelChange: (model: string[] | null) => void
  getValue: (node: IRowNode) => unknown
  options: Array<{ value: string; label: string }>
  field: string
}

export function BaseMultiSelectFilter({
  model,
  onModelChange,
  getValue,
  options,
}: BaseMultiSelectFilterProps) {
  const selectedValues = model || []

  const doesFilterPass = useCallback(
    ({ node }: { node: IRowNode }) => {
      if (selectedValues.length === 0) return true
      const cellValue = getValue(node)
      return selectedValues.includes(String(cellValue))
    },
    [selectedValues, getValue]
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
        <CommandInput placeholder="Buscar..." />
        <div className="flex gap-2 p-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            type="button"
          >
            Selecionar Todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            type="button"
          >
            Limpar
          </Button>
        </div>
        <CommandList>
          <CommandEmpty>Nenhum resultado</CommandEmpty>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.label}
              onSelect={() => handleToggle(option.value)}
            >
              <Checkbox
                checked={selectedValues.includes(option.value)}
                readOnly
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

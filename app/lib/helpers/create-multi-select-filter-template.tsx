import { MultiSelect } from "primereact/multiselect"

type FilterTemplateOptions<T extends string> = {
  value: T[]
  filterCallback: (value: T[], index?: number) => void
  index?: number
}

export function createMultiSelectFilterTemplate<T extends string>(
  options: Array<{ name: string; value: T }>,
  storageKey: string,
  setter: (value: T[]) => void,
  allStatuses: T[],
) {
  return (filterOptions: FilterTemplateOptions<T>) => {
    const selectedCount = filterOptions.value
      ? filterOptions.value.length
      : 0
    const totalCount = allStatuses.length

    return (
      <MultiSelect
        value={filterOptions.value}
        options={options.map((opt) => ({
          label: opt.name,
          value: opt.value,
        }))}
        onChange={(e) => {
          filterOptions.filterCallback(e.value, filterOptions.index)
          sessionStorage.setItem(storageKey, JSON.stringify(e.value))
          setter(e.value)
        }}
        placeholder={
          selectedCount > 0
            ? `${selectedCount} de ${totalCount} selecionados`
            : "Selecionar status"
        }
        display="chip"
        showClear
        filter
        filterPlaceholder="Buscar status"
        className="p-column-filter"
        maxSelectedLabels={3}
      />
    )
  }
}

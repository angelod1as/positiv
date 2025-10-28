import { useEffect, useState } from "react"
import { FilterMatchMode } from "primereact/api"
import { createMultiSelectFilterTemplate } from "~/lib/helpers/create-multi-select-filter-template"

type FilterConfig<T extends string = string> = {
  storageKey: string
  options: Array<{ name: string; value: T }>
  matchMode: string
  allValues: T[]
}

type FilterStateSetters = Record<string, (value: string[]) => void>

export function createFilterTemplates<
  TConfigs extends Record<string, FilterConfig>,
>(configs: TConfigs, setters: FilterStateSetters) {
  const templates: Record<string, ReturnType<typeof createMultiSelectFilterTemplate>> = {}

  Object.entries(configs).forEach(([field, config]) => {
    templates[field] = createMultiSelectFilterTemplate(
      config.options,
      config.storageKey,
      setters[field],
      config.allValues,
    )
  })

  return templates
}

export function createOnFilterHandler<
  TConfigs extends Record<string, FilterConfig>,
>(configs: TConfigs, setters: FilterStateSetters) {
  return (e: { filters: Record<string, unknown> }) => {
    const newFilters = e.filters

    Object.entries(configs).forEach(([field, _config]) => {
      const filterValue = newFilters[field] as { value: string[] } | undefined
      if (filterValue && setters[field]) {
        setters[field](filterValue.value)
      }
    })
  }
}

type FiltersState = {
  global: { value: null; matchMode: FilterMatchMode }
  [key: string]:
    | { value: null; matchMode: FilterMatchMode }
    | { value: string[]; matchMode: string }
}

export function useFilterState<TConfigs extends Record<string, FilterConfig>>(
  configs: TConfigs,
  filterValues: Record<string, string[]>,
) {
  const [filters, setFilters] = useState<FiltersState>(() => {
    const initial: FiltersState = {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    }

    Object.entries(configs).forEach(([field, config]) => {
      initial[field] = {
        value: filterValues[field] || [],
        matchMode: config.matchMode,
      }
    })

    return initial
  })

  Object.entries(configs).forEach(([field, config]) => {
    const filterValue = filterValues[field]
    useEffect(() => {
      setFilters((prevFilters) => ({
        ...prevFilters,
        [field]: {
          value: filterValue,
          matchMode: config.matchMode,
        },
      }))
    }, [filterValue, field, config.matchMode])
  })

  return filters
}

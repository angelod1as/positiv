import { useMemo } from "react"
import {
  createFilterTemplates,
  createOnFilterHandler,
  useFilterState,
} from "~/lib/hooks/use-multi-filter-manager"

export type FilterConfig<T extends string = string> = {
  storageKey: string
  options: Array<{ name: string; value: T; label?: string }>
  matchMode: string
  allValues: T[]
  defaultSelected?: T[]
}

export type FilterConfigs = Record<string, FilterConfig>

type DynamicOptionsFn<TData, TField extends string> = (
  data: TData[],
) => Array<{ name: string; value: TField; label?: string }>

type DynamicOptionsConfig<TData> = {
  [K: string]: DynamicOptionsFn<TData, string>
}

type FilterStates = Record<string, [string[], (value: string[]) => void]>

/**
 * Universal hook for table filter management.
 *
 * Consolidates filter orchestration by accepting filter states and generating
 * all the necessary helpers for PrimeReact DataTable:
 * - Builds dynamic filter options from data
 * - Generates filter templates for PrimeReact DataTable
 * - Creates filter state object
 * - Provides filter change handler
 * - Provides clear all filters handler
 *
 * NOTE: Due to Rules of Hooks, individual useSessionStorageFilter calls
 * must still be made in the component. This hook orchestrates everything else.
 *
 * @param configs - Filter configuration object from propMaps.ts
 * @param filterStates - Object mapping field names to [value, setter] tuples from useSessionStorageFilter
 * @param data - Optional data array for computing dynamic options
 * @param dynamicOptions - Optional functions to compute filter options from data
 * @returns Filter system ready to use with DataTable
 *
 * @example
 * ```tsx
 * const [statusFilter, setStatusFilter] = useSessionStorageFilter(...)
 * const [genderFilter, setGenderFilter] = useSessionStorageFilter(...)
 *
 * const { filters, filterTemplates, handleFilter, handleClearFilters } = useTableFilters(
 *   PARTICIPANTS_TABLE_FILTER_CONFIGS,
 *   {
 *     application_status: [statusFilter, setStatusFilter],
 *     gender: [genderFilter, setGenderFilter],
 *   },
 *   participants,
 *   {
 *     gender: genderFilterOptions,
 *   }
 * )
 *
 * <DataTable
 *   filters={filters}
 *   onFilter={handleFilter}
 *   onClearFilters={handleClearFilters}
 * >
 *   <Column filter filterElement={filterTemplates.gender} ... />
 * </DataTable>
 * ```
 */
export function useTableFilters<
  TConfigs extends FilterConfigs,
  TData = unknown,
>(
  configs: TConfigs,
  filterStates: FilterStates,
  data?: TData[],
  dynamicOptions?: DynamicOptionsConfig<TData>,
) {
  // Extract values and setters from filter states
  const filterValues: Record<string, string[]> = {}
  const filterSetters: Record<string, (value: string[]) => void> = {}

  Object.entries(filterStates).forEach(([field, [value, setter]]) => {
    filterValues[field] = value
    filterSetters[field] = setter
  })

  // Build dynamic filter configs if options need to be computed from data
  const dynamicFilterConfigs = useMemo(() => {
    if (!dynamicOptions || !data) {
      return configs
    }

    const result: FilterConfigs = { ...configs }

    Object.entries(dynamicOptions).forEach(([field, optionsFn]) => {
      if (configs[field]) {
        result[field] = {
          ...configs[field],
          options: optionsFn(data),
        }
      }
    })

    return result as TConfigs
  }, [configs, dynamicOptions, data])

  // Create filter templates for PrimeReact
  const filterTemplates = useMemo(
    () => createFilterTemplates(dynamicFilterConfigs, filterSetters),
    [dynamicFilterConfigs, filterSetters],
  )

  // Create filter state for DataTable
  const filters = useFilterState(dynamicFilterConfigs, filterValues)

  // Create filter change handler
  const handleFilter = useMemo(
    () => createOnFilterHandler(dynamicFilterConfigs, filterSetters),
    [dynamicFilterConfigs, filterSetters],
  )

  // Create clear all filters handler
  const handleClearFilters = () => {
    Object.values(filterSetters).forEach((setter) => {
      setter([])
    })

    Object.values(configs).forEach((config) => {
      sessionStorage.removeItem(config.storageKey)
    })
  }

  return {
    filters,
    filterTemplates,
    handleFilter,
    handleClearFilters,
  }
}

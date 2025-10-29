import { FilterService } from "primereact/api"

type FilterConfig = {
  matchMode: string
}

const registeredMatchModes = new Set<string>()

export function registerMultiSelectFilters(
  configs: Record<string, FilterConfig>,
): void {
  Object.values(configs).forEach(({ matchMode }) => {
    if (!registeredMatchModes.has(matchMode)) {
      FilterService.register(matchMode, (value, filters) => {
        if (!filters || filters.length === 0) return true
        return filters.includes(value)
      })
      registeredMatchModes.add(matchMode)
    }
  })
}

let arrayFiltersRegistered = false

export function registerArrayMultiSelectFilters(): void {
  if (arrayFiltersRegistered) return

  FilterService.register("custom_gender", (rowValue, filterValues) => {
    if (!filterValues || filterValues.length === 0) return true
    if (!Array.isArray(rowValue) || rowValue.length === 0) return false

    return filterValues.some((filterVal: string) =>
      rowValue.some((v) => v.toLowerCase() === filterVal.toLowerCase()),
    )
  })

  FilterService.register("custom_orientation", (rowValue, filterValues) => {
    if (!filterValues || filterValues.length === 0) return true
    if (!Array.isArray(rowValue) || rowValue.length === 0) return false

    return filterValues.some((filterVal: string) =>
      rowValue.some((v) => v.toLowerCase() === filterVal.toLowerCase()),
    )
  })

  arrayFiltersRegistered = true
}

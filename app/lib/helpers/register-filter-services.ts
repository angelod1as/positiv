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
        if (!filters || (Array.isArray(filters) && filters.length === 0)) return true
        const normalizedRow = String(value).toLowerCase()
        const list = Array.isArray(filters) ? filters : [filters]
        return list
          .filter((v) => v !== undefined && v !== null)
          .map((v) => String(v).toLowerCase())
          .includes(normalizedRow)
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

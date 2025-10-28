import { FilterService } from "primereact/api"

type FilterConfig = {
  matchMode: string
}

export function registerMultiSelectFilters(
  configs: Record<string, FilterConfig>,
): void {
  Object.values(configs).forEach(({ matchMode }) => {
    FilterService.register(matchMode, (value, filters) => {
      if (!filters || filters.length === 0) return true
      return filters.includes(value)
    })
  })
}

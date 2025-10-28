import { useState } from "react"

export function useSessionStorageFilter(
  storageKey: string,
  defaultValues: string[],
): [string[], (value: string[]) => void] {
  const [filter, setFilter] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const savedFilters = sessionStorage.getItem(storageKey)
      if (savedFilters) {
        try {
          return JSON.parse(savedFilters)
        } catch {
          return defaultValues
        }
      }
    }
    return defaultValues
  })

  return [filter, setFilter]
}

import { useEffect, useState } from "react"

export function useSessionStorageFilter(
  storageKey: string,
  defaultValues: string[],
): [string[], (value: string[]) => void] {
  const [filter, setFilter] = useState<string[]>(defaultValues)

  useEffect(() => {
    const savedFilters = sessionStorage.getItem(storageKey)
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters)
        setFilter(parsed)
      } catch {
        // Invalid data, keep defaults
      }
    }
  }, [storageKey])

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(filter))
  }, [filter, storageKey])

  return [filter, setFilter]
}

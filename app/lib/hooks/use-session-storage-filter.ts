import { useEffect, useState } from "react"

/**
 * Custom hook for filter state with sessionStorage persistence.
 *
 * IMPORTANT: This hook is designed to prevent SSR hydration errors.
 * We intentionally initialize with defaultValues and delay reading from
 * sessionStorage until after hydration completes (in useEffect).
 *
 * Pattern:
 * 1. Initialize useState with defaultValues (same on server + client)
 * 2. Read from sessionStorage in useEffect (after hydration)
 * 3. Persist changes to sessionStorage in second useEffect
 *
 * DO NOT refactor to use lazy initialization like:
 *   useState(() => sessionStorage.getItem(...))
 *
 * That pattern causes server/client mismatch because:
 * - Server renders with defaultValues (no sessionStorage access)
 * - Client would initialize with sessionStorage values
 * - React sees different initial states and throws hydration error
 *
 * @see commit 555a194 - Original hydration fix
 *
 * @param storageKey - The sessionStorage key for persistence
 * @param defaultValues - Default filter values (used during SSR and initial render)
 * @returns Tuple of [current filter values, setter function]
 */
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

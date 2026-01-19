import { useEffect, useState } from "react"

/**
 * A hook that keeps local state in sync with a prop value.
 *
 * This is useful when you need local state for controlled inputs that should
 * also update when the prop changes (e.g., after server revalidation).
 *
 * @param propValue - The prop value to sync with
 * @returns A tuple of [currentValue, setValue] similar to useState
 *
 * @example
 * ```tsx
 * const [localValue, setLocalValue] = useSyncedState(props.value)
 *
 * // Local changes work normally
 * setLocalValue("new value")
 *
 * // When props.value changes, localValue updates automatically
 * ```
 */
export function useSyncedState<T>(propValue: T) {
  const [value, setValue] = useState(propValue)

  useEffect(() => {
    setValue(propValue)
  }, [propValue])

  return [value, setValue] as const
}

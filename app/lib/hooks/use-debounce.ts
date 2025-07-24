import { useCallback, useRef } from "react"

/**
 * A custom hook that returns a debounced function.
 * The function will only be called after the specified delay has passed
 * without any new invocations.
 *
 * @param fn The function to debounce
 * @param delay The delay in milliseconds (default: 500ms)
 * @returns The debounced function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounceFunction<T extends (...args: any[]) => unknown>(
  fn: T,
  delay = 500,
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Use useCallback to memoize the debounced function
  return useCallback(
    (...args: Parameters<T>) => {
      // Clear the previous timeout
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Set a new timeout
      timerRef.current = setTimeout(() => {
        fn(...args)
        timerRef.current = null
      }, delay)
    },
    [fn, delay],
  )
}

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Defines the possible statuses for the debounced function.
 */
export type DebounceStatus = "idle" | "waiting" | "running"

/**
 * A custom hook that returns a debounced function and its current status.
 * The function will only be called after the specified delay has passed
 * without any new invocations.
 *
 * @param fn The function to debounce
 * @param delay The delay in milliseconds (default: 500ms)
 * @returns An array containing the debounced function and its status
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounceFunction<T extends (...args: any[]) => unknown>(
  fn: T,
  delay = 500,
): [(...args: Parameters<T>) => void, DebounceStatus] {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = useState<DebounceStatus>("idle")
  const fnRef = useRef(fn) // Use a ref to keep track of the latest fn

  // Update the fnRef whenever the `fn` changes
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  // Use useCallback to memoize the debounced function
  const debouncedFunction = useCallback(
    (...args: Parameters<T>) => {
      // Clear the previous timeout
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Set status to 'waiting' as soon as the user interacts
      setStatus("waiting")

      // Set a new timeout
      timerRef.current = setTimeout(() => {
        // Set to 'running' just before executing the function
        setStatus("running")
        fnRef.current(...args)
        // Set back to 'idle' after execution
        setStatus("idle")
        timerRef.current = null
      }, delay)
    },
    [delay],
  )

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return [debouncedFunction, status]
}

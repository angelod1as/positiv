import { useEffect } from "react"

/**
 * Marks `<html>` with `data-hydrated` once React has hydrated the page.
 *
 * The server renders every field, so a field being visible says nothing about
 * whether React is listening to it yet. Anything typed or ticked before then
 * is taken by React as the field's starting value without ever reaching state,
 * and the next re-render puts the field back to what state says. The e2e page
 * objects wait for this mark before touching a form.
 */
export function useMarkHydrated(): void {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true"
  }, [])
}

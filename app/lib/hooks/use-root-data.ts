import { useMatches } from "react-router"
import type { Route } from "~/+types/root"

export function useRootData() {
  const matches = useMatches()
  const rootMatch = matches.find((match) => match.id === "root")

  if (!rootMatch || !rootMatch.data) {
    throw new Error("useRootData must be used within a route that has root as an ancestor")
  }

  return rootMatch.data as Route.LoaderData
}

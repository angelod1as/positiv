// Imported by the Studio too, so it stays free of imports.
export const calloutColors = [
  "purple",
  "blue",
  "green",
  "lightgreen",
  "yellow",
  "red",
  "neutral",
] as const

export type CalloutColor = (typeof calloutColors)[number]

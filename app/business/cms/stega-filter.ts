import type { FilterDefault } from "@sanity/client/stega"

type FilterParams = Parameters<FilterDefault>[0]

// Fields whose strings are never display text: they end up in an href, an
// element attribute, a routing key or a discriminated-union literal, where the
// invisible stega characters break the link, the layout or zod validation.
// Matched on the last path segment at any depth, so a future field named one of
// these is also excluded from click-to-edit — add it here deliberately.
const NON_DISPLAY_FIELDS = new Set([
  "instagram", // founder-card builds https://instagram.com/${instagram}
  "alt", // image alt attribute
  "videoTitle", // founders iframe title attribute
  "network", // siteSettings social: a zod.literal, and the icon key
  "address", // a Page's routing key, matched by addressSchema's regex
])

// Only the Page-level title is skipped: it feeds <head> through meta(), never a
// rendered node, so it has no overlay to carry and leaks stega into the head.
// Section and header titles stay encoded, so clicking them opens the field.
function isPageTitle(sourcePath: FilterParams["sourcePath"]): boolean {
  return sourcePath.length === 1 && sourcePath[0] === "title"
}

export const stegaFilter: FilterDefault = (props) => {
  const field = props.sourcePath.at(-1)
  if (typeof field === "string" && NON_DISPLAY_FIELDS.has(field)) return false
  if (isPageTitle(props.sourcePath)) return false
  return props.filterDefault(props)
}

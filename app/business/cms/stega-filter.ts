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

// Paths that only feed <head> through meta(), never a rendered node: the
// Page-level title and the SEO title/description. They carry no overlay, so
// encoding them only leaks stega into the document title and the og tags. The
// default filter happens to skip the seo fields today, but listing them makes
// the guarantee ours instead of a quirk of the default filter's deny list.
// Matched as whole top-level paths, so a Section or header `title` still
// encodes and stays clickable.
const HEAD_ONLY_PATHS = new Set(["title", "seo.title", "seo.description"])

function isHeadOnlyPath(sourcePath: FilterParams["sourcePath"]): boolean {
  if (!sourcePath.every((segment) => typeof segment === "string")) return false
  return HEAD_ONLY_PATHS.has(sourcePath.join("."))
}

export const stegaFilter: FilterDefault = (props) => {
  const field = props.sourcePath.at(-1)
  if (typeof field === "string" && NON_DISPLAY_FIELDS.has(field)) return false
  if (isHeadOnlyPath(props.sourcePath)) return false
  return props.filterDefault(props)
}

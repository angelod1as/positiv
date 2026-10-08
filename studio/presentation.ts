import {
  defineDocuments,
  defineLocations,
  type PresentationPluginOptions,
} from "sanity/presentation"

export const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN || "http://localhost:5173"

// A Page's address is its whole path, so the route only has to fire on the URL;
// the Page is found from the pathname, not the segments. The schema puts no
// limit on address depth, so cover more levels than any realistic page needs.
const MAX_PAGE_DEPTH = 6
const pageRoutes = [
  "/",
  ...Array.from({ length: MAX_PAGE_DEPTH }, (_, depth) =>
    Array.from({ length: depth + 1 }, (_, segment) => `:s${segment}`).join("/"),
  ).map((pattern) => `/${pattern}`),
]

export const resolve: PresentationPluginOptions["resolve"] = {
  mainDocuments: defineDocuments([
    {
      route: pageRoutes,
      resolve: ({ path }) => ({
        filter: `_type == "page" && address == $address`,
        params: { address: path },
      }),
    },
  ]),
  locations: {
    page: defineLocations({
      select: { title: "title", address: "address" },
      resolve: (doc) => ({
        locations: [
          { title: doc?.title || "Página", href: doc?.address || "/" },
        ],
      }),
    }),
    siteSettings: defineLocations({
      message: "Aparece em todas as páginas do site",
      tone: "positive",
      locations: [{ title: "Página inicial", href: "/" }],
    }),
  },
}

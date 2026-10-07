import { defineLocations, type PresentationPluginOptions } from "sanity/presentation"

export const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN || "http://localhost:5173"

export const resolve: PresentationPluginOptions["resolve"] = {
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

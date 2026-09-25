import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"

import { schemaTypes } from "./schemas/schema-types"
import { homepageActions, withoutSingletons } from "./singletons"
import { structure } from "./structure"

export default defineConfig({
  name: "default",
  title: "Positiv",

  projectId: "8ojkallk",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",

  plugins: [structureTool({ structure }), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: homepageActions,
    newDocumentOptions: withoutSingletons,
  },
})

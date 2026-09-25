import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"

import { schemaTypes } from "./schemas/schema-types"

export default defineConfig({
  name: "default",
  title: "Positiv",

  projectId: "8ojkallk",
  dataset: "production",

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})

import { createClient } from "@sanity/client"
import { validateDocumentWithWorkspace } from "@sanity/validation"
import { getFallbackLocaleSource } from "@sanity/validation/_internal"
import { createSchema } from "sanity"

import { schemaTypes } from "../schemas/schema-types"

const schema = createSchema({
  name: "test",
  types: [
    ...schemaTypes,
    {
      name: "testHost",
      type: "document",
      fields: schemaTypes.map((type) => ({ name: type.name, type: type.name })),
    },
  ],
})

const client = createClient({
  projectId: "test",
  dataset: "test",
  apiVersion: "2026-09-24",
  useCdn: false,
})

type Level = "error" | "warning"

async function markersIn(
  document: { _type: string } & Record<string, unknown>,
  level: Level,
) {
  const markers = await validateDocumentWithWorkspace({
    document: {
      _id: "test",
      _createdAt: "",
      _updatedAt: "",
      _rev: "",
      ...document,
    },
    workspace: {
      schema,
      getClient: ({ apiVersion }) => client.withConfig({ apiVersion }),
      i18n: getFallbackLocaleSource(),
    },
    environment: "studio",
    getDocumentExists: async () => true,
  })

  return markers
    .filter((marker) => marker.level === level)
    .map((marker) => ({
      path: marker.path
        .map((segment) =>
          typeof segment === "object" && "_key" in segment
            ? segment._key
            : String(segment),
        )
        .join("."),
      message: marker.message,
    }))
}

export function validateDocumentOf(
  type: string,
  fields: Record<string, unknown>,
  level: Level = "error",
) {
  return markersIn({ _type: type, ...fields }, level)
}

export function validateValueOf(
  type: string,
  value: unknown,
  level: Level = "error",
) {
  return markersIn({ _type: "testHost", [type]: value }, level)
}

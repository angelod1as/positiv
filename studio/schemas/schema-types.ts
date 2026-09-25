import type { SchemaTypeDefinition } from "sanity"

import { person } from "./documents/person"
import { richText } from "./objects/rich-text"

export const schemaTypes: SchemaTypeDefinition[] = [richText, person]

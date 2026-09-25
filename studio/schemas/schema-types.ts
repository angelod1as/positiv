import type { SchemaTypeDefinition } from "sanity"

import { person } from "./documents/person"
import { richText } from "./objects/rich-text"
import { about } from "./sections/about"
import { ctaBanner } from "./sections/cta-banner"
import { feedback } from "./sections/feedback"
import { founders } from "./sections/founders"
import { hero } from "./sections/hero"
import { nextEvents } from "./sections/next-events"
import { testimonials } from "./sections/testimonials"

export const schemaTypes: SchemaTypeDefinition[] = [
  richText,
  person,
  hero,
  about,
  nextEvents,
  testimonials,
  ctaBanner,
  founders,
  feedback,
]

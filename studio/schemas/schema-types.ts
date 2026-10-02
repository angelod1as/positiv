import type { SchemaTypeDefinition } from "sanity"

import { homepage } from "./documents/homepage"
import { page } from "./documents/page"
import { person } from "./documents/person"
import { longRichText } from "./objects/long-rich-text"
import { richText } from "./objects/rich-text"
import { seo } from "./objects/seo"
import { siteLink } from "./objects/site-link"
import { homepageHero } from "./page-header/homepage-hero"
import { pageHero } from "./page-header/page-hero"
import { pageTitle } from "./page-header/page-title"
import { about } from "./sections/about"
import { ctaBanner } from "./sections/cta-banner"
import { feedback } from "./sections/feedback"
import { founders } from "./sections/founders"
import { hero } from "./sections/hero"
import { imageSection } from "./sections/image-section"
import { nextEvents } from "./sections/next-events"
import { richTextSection } from "./sections/rich-text-section"
import { testimonials } from "./sections/testimonials"

export const schemaTypes: SchemaTypeDefinition[] = [
  richText,
  longRichText,
  seo,
  siteLink,
  person,
  hero,
  about,
  nextEvents,
  testimonials,
  ctaBanner,
  founders,
  feedback,
  richTextSection,
  imageSection,
  homepage,
  homepageHero,
  pageHero,
  pageTitle,
  page,
]

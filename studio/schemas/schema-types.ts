import type { SchemaTypeDefinition } from "sanity"

import { emailTemplates } from "./documents/email-templates"
import { likertScale } from "./documents/likert-scale"
import { page } from "./documents/page"
import { paymentMessages } from "./documents/payment-messages"
import { person } from "./documents/person"
import { rules } from "./documents/rules"
import { siteSettings } from "./documents/site-settings"
import { calloutText } from "./objects/callout-text"
import { longRichText } from "./objects/long-rich-text"
import { richText } from "./objects/rich-text"
import { rule } from "./objects/rule"
import { seo } from "./objects/seo"
import { siteLink } from "./objects/site-link"
import { homepageHero } from "./page-header/homepage-hero"
import { pageHero } from "./page-header/page-hero"
import { pageTitle } from "./page-header/page-title"
import { about } from "./sections/about"
import { callout } from "./sections/callout"
import { ctaBanner } from "./sections/cta-banner"
import { feedback } from "./sections/feedback"
import { chartSection } from "./sections/chart-section"
import { founders } from "./sections/founders"
import { imageSection } from "./sections/image-section"
import { nextEvents } from "./sections/next-events"
import { richTextSection } from "./sections/rich-text-section"
import { rulesSection } from "./sections/rules-section"
import { sideBySide } from "./sections/side-by-side"
import { statsSection } from "./sections/stats-section"
import { systemComponent } from "./sections/system-component"
import { testimonials } from "./sections/testimonials"

export const schemaTypes: SchemaTypeDefinition[] = [
  richText,
  longRichText,
  calloutText,
  seo,
  siteLink,
  rule,
  person,
  about,
  nextEvents,
  testimonials,
  ctaBanner,
  founders,
  feedback,
  richTextSection,
  imageSection,
  statsSection,
  chartSection,
  callout,
  sideBySide,
  systemComponent,
  rulesSection,
  homepageHero,
  pageHero,
  pageTitle,
  page,
  siteSettings,
  paymentMessages,
  emailTemplates,
  likertScale,
  rules,
]

import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { reservedAddresses } from "../../reserved-addresses"
import {
  foundersFields,
  longPortableTextSchema,
  pageImageSchema,
  personFields,
  portableTextSchema,
  sanityImageSchema,
  sectionsFields,
} from "./content.schema"

export function isReservedAddress(address: string) {
  return reservedAddresses.includes(address.split("/")[1])
}

const addressSchema = zod
  .string()
  .refine(
    (address) =>
      address === "/" ||
      (/^(\/[a-z0-9-]+)+$/.test(address) && !isReservedAddress(address)),
    { message: "Not a Page address" },
  )

export const pageHeaderSchema = zod.discriminatedUnion("_type", [
  zod.object({
    _type: zod.literal("homepageHero"),
    title: zod.string(),
    subtitle: portableTextSchema,
  }),
  zod.object({
    _type: zod.literal("pageHero"),
    title: zod.string(),
    subtitle: portableTextSchema,
  }),
  zod.object({
    _type: zod.literal("pageTitle"),
    title: zod.string(),
    intro: zod.string().nullish(),
  }),
])

function section<Type extends string, Shape extends z.ZodRawShape>(
  type: Type,
  shape: Shape,
) {
  return zod.object({ _type: zod.literal(type), _key: zod.string(), ...shape })
}

const sharedSections = [
  section("nextEvents", sectionsFields.nextEvents.shape),
  section("about", sectionsFields.about.shape),
  section("testimonials", sectionsFields.testimonials.shape),
  section("ctaBanner", sectionsFields.ctaBanner.shape),
  section("feedback", sectionsFields.feedback.shape),
  section("richTextSection", {
    title: zod.string().nullish(),
    body: longPortableTextSchema,
  }),
] as const

const imageDimensionsSchema = zod.object({
  width: zod.number().positive(),
  height: zod.number().positive(),
})

export const pageSectionDocumentSchema = zod.discriminatedUnion("_type", [
  ...sharedSections,
  section("founders", {
    ...foundersFields,
    people: zod
      .array(zod.object({ ...personFields, photo: sanityImageSchema }))
      .min(1),
  }),
  section("imageSection", {
    image: sanityImageSchema
      .extend({ dimensions: imageDimensionsSchema })
      .refine(
        ({ crop }) =>
          !crop || (crop.left + crop.right < 1 && crop.top + crop.bottom < 1),
        { message: "The crop leaves nothing of the image" },
      ),
    caption: zod.string().nullish(),
  }),
])

const pageSectionSchema = zod.discriminatedUnion("_type", [
  ...sharedSections,
  section("founders", {
    ...foundersFields,
    people: zod
      .array(zod.object({ ...personFields, photo: pageImageSchema }))
      .min(1),
  }),
  section("imageSection", {
    image: pageImageSchema,
    caption: zod.string().nullish(),
  }),
])

function sectionsSchema<Section extends z.ZodType<{ _type: string }>>(
  member: Section,
) {
  return zod
    .array(member)
    .min(1)
    .refine(
      (sections) =>
        sections.filter((candidate) => candidate._type === "nextEvents")
          .length <= 1,
      { message: "A Page holds at most one Next Events Section" },
    )
}

const seoFields = {
  title: zod.string().nullish(),
  description: zod.string(),
  noIndex: zod.boolean().nullish(),
}

export const pageDocumentSchema = zod.object({
  _id: zod.string(),
  _updatedAt: zod.iso.datetime(),
  title: zod.string(),
  address: addressSchema,
  header: zod.tuple([pageHeaderSchema]),
  sections: sectionsSchema(pageSectionDocumentSchema),
  seo: zod.object({ ...seoFields, image: sanityImageSchema.nullish() }),
})

const DRAFT_FALLBACK_DATE = "1970-01-01T00:00:00.000Z"

const draftSeoShellSchema = zod
  .object({ ...seoFields, image: sanityImageSchema.nullish() })
  .catch({ title: null, description: "", noIndex: true, image: null })

// In draft mode only the address has to be valid, so the Page can be routed to
// and keyed. Everything else falls back to a safe default, so an incomplete
// shell still renders its Header and Section placeholders instead of 404ing.
export const draftPageShellSchema = zod.object({
  _id: zod.string().catch("unknown"),
  _updatedAt: zod.iso.datetime().catch(DRAFT_FALLBACK_DATE),
  title: zod.string().catch(""),
  address: addressSchema,
  header: zod.array(zod.unknown()).catch([]),
  sections: zod.array(zod.unknown()).catch([]),
  seo: draftSeoShellSchema,
})

export const pageSchema = zod.object({
  _id: zod.string(),
  _updatedAt: zod.iso.datetime(),
  title: zod.string(),
  address: addressSchema,
  header: pageHeaderSchema,
  sections: sectionsSchema(pageSectionSchema),
  seo: zod.object({ ...seoFields, image: pageImageSchema.nullish() }),
})

export type PageDocument = z.infer<typeof pageDocumentSchema>

export type HeaderPlaceholder = { _type: "placeholder"; missing: string[] }
export type SectionPlaceholder = {
  _type: "placeholder"
  _key: string
  missing: string[]
}

type ValidPage = z.infer<typeof pageSchema>

export type PageHeader = ValidPage["header"] | HeaderPlaceholder
export type PageSection = ValidPage["sections"][number] | SectionPlaceholder

export type Page = Omit<ValidPage, "header" | "sections"> & {
  header: PageHeader
  sections: PageSection[]
}

import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { reservedAddresses } from "../../../studio/reserved-addresses"
import {
  foundersFields,
  homepageImageSchema,
  longPortableTextSchema,
  personFields,
  portableTextSchema,
  sanityImageSchema,
  sectionsFields,
} from "./homepage-content.schema"

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

const pageSectionDocumentSchema = zod.discriminatedUnion("_type", [
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
      .array(zod.object({ ...personFields, photo: homepageImageSchema }))
      .min(1),
  }),
  section("imageSection", {
    image: homepageImageSchema,
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
  title: zod.string(),
  address: addressSchema,
  header: zod.tuple([pageHeaderSchema]),
  sections: sectionsSchema(pageSectionDocumentSchema),
  seo: zod.object({ ...seoFields, image: sanityImageSchema.nullish() }),
})

export const pageSchema = zod.object({
  _id: zod.string(),
  title: zod.string(),
  address: addressSchema,
  header: pageHeaderSchema,
  sections: sectionsSchema(pageSectionSchema),
  seo: zod.object({ ...seoFields, image: homepageImageSchema.nullish() }),
})

export type PageDocument = z.infer<typeof pageDocumentSchema>
export type Page = z.infer<typeof pageSchema>
export type PageHeader = Page["header"]
export type PageSection = Page["sections"][number]

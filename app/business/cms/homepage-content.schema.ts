import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"

const portableTextSchema = zod
  .array(
    zod.looseObject({
      _type: zod.string(),
      _key: zod.string(),
    }),
  )
  .min(1)

const sanityImageSchema = zod.object({
  alt: zod.string(),
  asset: zod.object({
    _ref: zod.string(),
    _type: zod.literal("reference"),
  }),
  crop: zod
    .object({
      top: zod.number(),
      bottom: zod.number(),
      left: zod.number(),
      right: zod.number(),
    })
    .nullish(),
  hotspot: zod
    .object({
      x: zod.number(),
      y: zod.number(),
      width: zod.number(),
      height: zod.number(),
    })
    .nullish(),
})

export const homepageImageSchema = zod.object({
  url: zod.url(),
  alt: zod.string(),
  width: zod.number(),
  height: zod.number(),
})

const personFields = {
  _id: zod.string(),
  name: zod.string(),
  pronouns: zod.string(),
  instagram: zod.string(),
  bio: portableTextSchema,
}

const sectionsFields = {
  hero: zod.object({
    title: zod.string(),
    subtitle: portableTextSchema,
  }),
  nextEvents: zod.object({
    title: zod.string(),
    subtitle: zod.string(),
    count: zod.number().int(),
  }),
  about: zod.object({
    title: zod.string(),
    cards: zod.array(
      zod.object({
        _key: zod.string(),
        title: zod.string(),
        body: portableTextSchema,
      }),
    ),
  }),
  testimonials: zod.object({
    title: zod.string(),
    subtitle: zod.string(),
    quotes: zod.array(
      zod.object({
        _key: zod.string(),
        author: zod.string(),
        quote: zod.string(),
      }),
    ),
  }),
  ctaBanner: zod.object({
    title: zod.string(),
    body: portableTextSchema,
  }),
  feedback: zod.object({
    title: zod.string(),
    body: portableTextSchema,
    ctaLabel: zod.string(),
  }),
}

const foundersFields = {
  title: zod.string(),
  videoUrl: zod.url(),
  videoTitle: zod.string(),
}

export const homepageDocumentSchema = zod.object({
  ...sectionsFields,
  founders: zod.object({
    ...foundersFields,
    people: zod.array(
      zod.object({ ...personFields, photo: sanityImageSchema }),
    ),
  }),
})

export const homepageContentSchema = zod.object({
  ...sectionsFields,
  founders: zod.object({
    ...foundersFields,
    people: zod.array(
      zod.object({ ...personFields, photo: homepageImageSchema }),
    ),
  }),
})

export type HomepageDocument = z.infer<typeof homepageDocumentSchema>
export type HomepageContent = z.infer<typeof homepageContentSchema>
export type HomepageImage = z.infer<typeof homepageImageSchema>
export type PortableText = z.infer<typeof portableTextSchema>

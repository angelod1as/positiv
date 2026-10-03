import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"

const spanSchema = zod.object({
  _type: zod.literal("span"),
  _key: zod.string(),
  text: zod.string(),
  marks: zod.array(zod.string()).optional(),
})

const decorators = ["strong", "em"]

const hrefSchema = zod.union([
  zod.string().regex(/^\/(?![/\\])[^\s\p{Cc}]*$/u),
  zod.url({ protocol: /^https$/ }),
])

const blockSchema = <
  Style extends z.ZodType<string>,
  ListItem extends z.ZodType<string | undefined>,
>(
  style: Style,
  listItem: ListItem,
) =>
  zod
    .object({
      _type: zod.literal("block"),
      _key: zod.string(),
      style,
      listItem,
      level: zod.number().int().optional(),
      markDefs: zod
        .array(
          zod.object({
            _type: zod.literal("link"),
            _key: zod.string(),
            href: hrefSchema,
          }),
        )
        .optional(),
      children: zod.array(spanSchema),
    })
    .superRefine((block, context) => {
      const allowed = [
        ...decorators,
        ...(block.markDefs ?? []).map((markDef) => markDef._key),
      ]

      block.children.forEach((span, spanIndex) => {
        span.marks?.forEach((mark, markIndex) => {
          if (!allowed.includes(mark)) {
            context.addIssue({
              code: "custom",
              message: `Unknown mark "${mark}"`,
              path: ["children", spanIndex, "marks", markIndex],
            })
          }
        })
      })
    })

export const portableTextSchema = zod
  .array(blockSchema(zod.literal("normal"), zod.never().optional()))
  .min(1)

export const longPortableTextSchema = zod
  .array(
    blockSchema(
      zod.enum(["normal", "h2", "h3", "blockquote"]),
      zod.enum(["bullet", "number"]).optional(),
    ),
  )
  .min(1)

export const sanityImageSchema = zod.object({
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

export const personFields = {
  _id: zod.string(),
  name: zod.string(),
  pronouns: zod.string(),
  instagram: zod.string(),
  bio: portableTextSchema,
}

export const sectionsFields = {
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
    cards: zod
      .array(
        zod.object({
          _key: zod.string(),
          title: zod.string(),
          body: portableTextSchema,
        }),
      )
      .length(3),
  }),
  testimonials: zod.object({
    title: zod.string(),
    subtitle: zod.string(),
    quotes: zod
      .array(
        zod.object({
          _key: zod.string(),
          author: zod.string(),
          quote: zod.string(),
        }),
      )
      .min(1),
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

export const foundersFields = {
  title: zod.string(),
  videoUrl: zod.url(),
  videoTitle: zod.string(),
}

export const homepageDocumentSchema = zod.object({
  ...sectionsFields,
  founders: zod.object({
    ...foundersFields,
    people: zod
      .array(zod.object({ ...personFields, photo: sanityImageSchema }))
      .min(1),
  }),
})

export const homepageContentSchema = zod.object({
  ...sectionsFields,
  founders: zod.object({
    ...foundersFields,
    people: zod
      .array(zod.object({ ...personFields, photo: homepageImageSchema }))
      .min(1),
  }),
})

export type HomepageDocument = z.infer<typeof homepageDocumentSchema>
export type HomepageContent = z.infer<typeof homepageContentSchema>
export type HomepageImage = z.infer<typeof homepageImageSchema>
export type PortableText = z.infer<typeof portableTextSchema>
export type LongPortableText = z.infer<typeof longPortableTextSchema>

import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { hrefSchema, portableTextSchema } from "./homepage-content.schema"

const siteLinkSchema = zod
  .object({
    _key: zod.string(),
    label: zod.string(),
    page: zod.object({ address: zod.string() }).nullish(),
    url: hrefSchema.nullish(),
  })
  .refine((link) => Boolean(link.page) !== Boolean(link.url), {
    message: "A link points to a Page or to an address, exactly one of them",
  })
  .transform(({ _key, label, page, url }) => ({
    _key,
    label,
    href: page?.address ?? url ?? "",
  }))

const listSchema = <Item extends z.ZodType>(item: Item) =>
  zod
    .array(item)
    .nullish()
    .transform((items) => items ?? [])

export const siteSettingsSchema = zod.object({
  navigation: listSchema(siteLinkSchema),
  footer: zod.object({
    columns: listSchema(
      zod.object({
        _key: zod.string(),
        title: zod.string(),
        links: zod.array(siteLinkSchema).min(1),
      }),
    ),
    social: listSchema(
      zod.object({
        _key: zod.string(),
        network: zod.literal("instagram"),
        url: zod.url({ protocol: /^https$/ }),
      }),
    ),
    text: portableTextSchema,
  }),
})

export type SiteSettings = z.output<typeof siteSettingsSchema>
export type SiteLink = SiteSettings["navigation"][number]

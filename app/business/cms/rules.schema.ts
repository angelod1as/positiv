import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { longPortableTextSchema } from "./content.schema"

export const ruleSchema = zod.object({
  _key: zod.string(),
  title: zod.string(),
  body: longPortableTextSchema,
  highlight: zod
    .object({
      title: zod.string().nullish(),
      body: longPortableTextSchema,
    })
    .nullish(),
})

export const ruleListSchema = zod.array(ruleSchema)

export const ruleHeadingFields = {
  title: zod.string().nullish(),
  subtitle: zod.string().nullish(),
}

const partSchema = zod.object({
  ...ruleHeadingFields,
  rules: ruleListSchema.nullish().transform((rules) => rules ?? []),
})

export const rulesSchema = zod.object({
  generalRules: partSchema,
  agreements: partSchema,
  privateRules: partSchema,
})

export type Rule = z.output<typeof ruleSchema>
export type RulesPartContent = z.output<typeof partSchema>
export type Rules = z.output<typeof rulesSchema>

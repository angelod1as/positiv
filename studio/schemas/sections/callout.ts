import { BulbOutlineIcon } from "@sanity/icons/BulbOutline"
import { defineField, defineType, type PortableTextBlock } from "sanity"

import { calloutTextProblem } from "../objects/callout-text"

export const calloutColors = [
  { title: "Roxo", value: "purple" },
  { title: "Azul", value: "blue" },
  { title: "Verde", value: "green" },
  { title: "Verde-claro", value: "lightgreen" },
  { title: "Amarelo", value: "yellow" },
  { title: "Vermelho", value: "red" },
  { title: "Neutro", value: "neutral" },
]

// Drawn as an emoji, not as text: © and ™ are pictographic but print as
// letters unless a variation selector (U+FE0F) asks for the emoji form.
const emojiPresentation =
  /\p{Emoji_Presentation}|\uFE0F|\p{Regional_Indicator}|\u20E3/u

export function isSingleEmoji(value: string) {
  const graphemes = [
    ...new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(value),
  ]

  return graphemes.length === 1 && emojiPresentation.test(value)
}

function plainTextOf(blocks: PortableTextBlock[] | undefined) {
  return (blocks ?? [])
    .flatMap((block) =>
      Array.isArray(block.children)
        ? block.children.map((child: { text?: string }) => child.text ?? "")
        : [],
    )
    .join(" ")
}

export const callout = defineType({
  name: "callout",
  title: "Callout",
  description: "Uma informação curta em destaque, com emoji, título e cor",
  type: "object",
  icon: BulbOutlineIcon,
  fields: [
    defineField({
      name: "emoji",
      title: "Emoji",
      description: "Opcional. Um emoji só, que aparece antes do título",
      type: "string",
      validation: (rule) =>
        rule.custom<string>((emoji) =>
          emoji === undefined || isSingleEmoji(emoji)
            ? true
            : "Use um emoji só, sem texto",
        ),
    }),
    defineField({
      name: "title",
      title: "Título",
      description: "Opcional",
      type: "string",
    }),
    defineField({
      name: "body",
      title: "Texto",
      type: "calloutText",
      validation: (rule) => rule.required().custom(calloutTextProblem),
    }),
    defineField({
      name: "color",
      title: "Cor",
      type: "string",
      options: { list: calloutColors, layout: "radio", direction: "horizontal" },
      initialValue: "purple",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "title", emoji: "emoji", body: "body", color: "color" },
    prepare: ({ title, emoji, body, color }) => ({
      title: [emoji, title || plainTextOf(body)].filter(Boolean).join(" "),
      subtitle: `Callout, ${
        calloutColors.find((option) => option.value === color)?.title ?? "sem cor"
      }`,
    }),
  },
})

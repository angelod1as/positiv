import { BulbOutlineIcon } from "@sanity/icons/BulbOutline"
import { defineField, defineType, type PortableTextBlock } from "sanity"

import {
  type CalloutColor,
  calloutColors,
} from "../../../app/business/cms/callout-colors"
import { calloutTextProblem } from "../objects/callout-text"

const colorTitles: Record<CalloutColor, string> = {
  purple: "Roxo",
  blue: "Azul",
  green: "Verde",
  lightgreen: "Verde-claro",
  yellow: "Amarelo",
  red: "Vermelho",
  neutral: "Neutro",
}

const colorOptions = calloutColors.map((value) => ({
  title: colorTitles[value],
  value,
}))

// Drawn as an emoji, not as text: © and ™ are pictographic but print as
// letters unless a variation selector (U+FE0F) follows them, and a keycap
// holds only a digit, # or *.
const emojiPresentation =
  /^(?:[0-9#*]\uFE0F?\u20E3|.*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F).*)$/u

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
            : "Use um emoji só, sem texto, escolhido no seletor de emoji do sistema",
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
      options: { list: colorOptions, layout: "radio", direction: "horizontal" },
      initialValue: "purple",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "title", emoji: "emoji", body: "body", color: "color" },
    prepare: ({ title, emoji, body, color }) => ({
      title: [emoji, title || plainTextOf(body)].filter(Boolean).join(" "),
      subtitle: `Callout, ${
        colorTitles[color as CalloutColor] ?? "sem cor"
      }`,
    }),
  },
})

import {
  defineArrayMember,
  defineField,
  defineType,
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
  type UrlRule,
} from "sanity"

export const decorators = [
  { title: "Negrito", value: "strong" },
  { title: "Itálico", value: "em" },
]

export function hrefRule(rule: UrlRule) {
  return rule
    .uri({ scheme: ["https"], allowRelative: true })
    .custom<string>((href) =>
      href?.startsWith("//") ||
      href?.startsWith("/\\") ||
      /[\s\p{Cc}]/u.test(href ?? "")
        ? "Comece com / ou com https://"
        : true,
    )
}

export const link = defineField({
  name: "link",
  title: "Link",
  type: "object",
  fields: [
    defineField({
      name: "href",
      title: "Endereço",
      description:
        "Uma página do site, começando com / (por exemplo /eventos), ou um endereço começando com https://",
      type: "url",
      validation: (rule) => hrefRule(rule.required()),
    }),
  ],
})

const decoratorValues = decorators.map((decorator) => decorator.value)

function isAllowed(block: PortableTextBlock) {
  if (block._type !== "block" || !isPortableTextTextBlock(block)) {
    return false
  }

  const annotationKeys = (block.markDefs ?? [])
    .filter((markDef) => markDef._type === "link")
    .map((markDef) => markDef._key)

  return block.children.every(
    (child) =>
      isPortableTextSpan(child) &&
      (child.marks ?? []).every(
        (mark) =>
          decoratorValues.includes(mark) || annotationKeys.includes(mark),
      ),
  )
}

export function blockProblem(message: string) {
  return (blocks: PortableTextBlock[] | undefined) => {
    const block = blocks?.find((candidate) => !isAllowed(candidate))

    return block ? { message, path: [{ _key: block._key }] } : true
  }
}

export const richTextProblem = blockProblem(
  "Só são permitidos parágrafos com negrito, itálico e links",
)

export const richText = defineType({
  name: "richText",
  title: "Texto formatado",
  type: "array",
  validation: (rule) => rule.custom(richTextProblem),
  of: [
    defineArrayMember({
      type: "block",
      styles: [{ title: "Parágrafo", value: "normal" }],
      lists: [],
      marks: {
        decorators,
        annotations: [link],
      },
    }),
  ],
})

import {
  defineArrayMember,
  defineField,
  defineType,
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
} from "sanity"

const decorators = ["strong", "em"]

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
        (mark) => decorators.includes(mark) || annotationKeys.includes(mark),
      ),
  )
}

export const richText = defineType({
  name: "richText",
  title: "Texto formatado",
  type: "array",
  validation: (rule) =>
    rule.custom<PortableTextBlock[]>((blocks) => {
      const block = blocks?.find((candidate) => !isAllowed(candidate))

      return block
        ? {
            message:
              "Só são permitidos parágrafos com negrito, itálico e links",
            path: [{ _key: block._key }],
          }
        : true
    }),
  of: [
    defineArrayMember({
      type: "block",
      styles: [{ title: "Parágrafo", value: "normal" }],
      lists: [],
      marks: {
        decorators: [
          { title: "Negrito", value: "strong" },
          { title: "Itálico", value: "em" },
        ],
        annotations: [
          defineField({
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
                validation: (rule) =>
                  rule
                    .required()
                    .uri({ scheme: ["https"], allowRelative: true })
                    .custom<string>((href) =>
                      href?.startsWith("//")
                        ? "Comece com / ou com https://"
                        : true,
                    ),
              }),
            ],
          }),
        ],
      },
    }),
  ],
})

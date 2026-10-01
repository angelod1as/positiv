import { ImageIcon } from "@sanity/icons/Image"
import { defineField, defineType } from "sanity"

export const imageSection = defineType({
  name: "imageSection",
  title: "Imagem",
  description: "Uma imagem sozinha, com legenda opcional",
  type: "object",
  icon: ImageIcon,
  fields: [
    defineField({
      name: "image",
      title: "Imagem",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texto alternativo",
          description: "Descreva a imagem para quem usa leitor de tela",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required().assetRequired(),
    }),
    defineField({
      name: "caption",
      title: "Legenda",
      description: "Opcional; aparece abaixo da imagem",
      type: "string",
    }),
  ],
  preview: {
    select: { title: "caption", media: "image" },
    prepare: ({ title, media }) => ({ title: title ?? "Imagem", media }),
  },
})

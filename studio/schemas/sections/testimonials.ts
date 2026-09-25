import { CommentIcon } from "@sanity/icons/Comment"
import { defineArrayMember, defineField, defineType } from "sanity"

export const testimonials = defineType({
  name: "testimonials",
  title: "Depoimentos",
  type: "object",
  icon: CommentIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtítulo",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "quotes",
      title: "Depoimentos",
      type: "array",
      of: [
        defineArrayMember({
          name: "testimonial",
          title: "Depoimento",
          type: "object",
          fields: [
            defineField({
              name: "author",
              title: "Quem disse",
              description: "Inicial e idade, por exemplo A., 32",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "quote",
              title: "Depoimento",
              type: "text",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: "author", subtitle: "quote" },
          },
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
  ],
})

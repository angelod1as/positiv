import { UserIcon } from "@sanity/icons/User"
import { defineField, defineType } from "sanity"

export const person = defineType({
  name: "person",
  title: "Pessoa",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "name",
      title: "Nome",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "pronouns",
      title: "Pronomes",
      description: "Como aparecem no site, por exemplo ele/dele",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "instagram",
      title: "Instagram",
      description: "Só o nome de usuário, sem @ e sem o link",
      type: "string",
      validation: (rule) =>
        rule
          .required()
          .regex(/^[A-Za-z0-9._]+$/, { name: "nome de usuário do Instagram" }),
    }),
    defineField({
      name: "photo",
      title: "Foto",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texto alternativo",
          description: "Descreva a foto para quem usa leitor de tela",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required().assetRequired(),
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "richText",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "pronouns", media: "photo" },
  },
})

import { SearchIcon } from "@sanity/icons/Search"
import { defineField, defineType } from "sanity"

export const seo = defineType({
  name: "seo",
  title: "SEO",
  description:
    "Como a página aparece no Google e quando alguém compartilha o link",
  type: "object",
  icon: SearchIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      description: "Se ficar vazio, usa o título da página",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Descrição",
      description: "Entre 50 e 160 caracteres",
      type: "text",
      rows: 3,
      validation: (rule) => [
        rule.required(),
        rule
          .min(50)
          .max(160)
          .warning("A descrição funciona melhor entre 50 e 160 caracteres"),
      ],
    }),
    defineField({
      name: "image",
      title: "Imagem de compartilhamento",
      description: "Aparece quando alguém compartilha o link da página",
      type: "image",
      fields: [
        defineField({
          name: "alt",
          title: "Texto alternativo",
          description: "Descreva a imagem para quem usa leitor de tela",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: "noIndex",
      title: "Esconder dos buscadores",
      description:
        "Marque para que Google e outros buscadores não mostrem esta página",
      type: "boolean",
      initialValue: false,
    }),
  ],
})

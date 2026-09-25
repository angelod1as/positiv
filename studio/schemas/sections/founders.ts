import { UsersIcon } from "@sanity/icons/Users"
import { defineArrayMember, defineField, defineType } from "sanity"

const youtubeLink =
  /^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/

export const founders = defineType({
  name: "founders",
  title: "Quem faz a Positiv",
  type: "object",
  icon: UsersIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "people",
      title: "Pessoas",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "person" }] })],
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: "videoUrl",
      title: "Vídeo",
      description:
        "Cole o link do vídeo no YouTube, como aparece na barra do navegador ou no botão Compartilhar",
      type: "url",
      validation: (rule) =>
        rule
          .required()
          .uri({ scheme: ["https"] })
          .custom<string>((url) =>
            url === undefined || youtubeLink.test(url)
              ? true
              : "Use um link de vídeo do YouTube",
          ),
    }),
    defineField({
      name: "videoTitle",
      title: "Descrição do vídeo",
      description: "Lida por leitores de tela no lugar do vídeo",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
})

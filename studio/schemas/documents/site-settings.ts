import { CogIcon } from "@sanity/icons/Cog"
import { defineArrayMember, defineField, defineType } from "sanity"

import { hrefRule, richTextProblem } from "../objects/rich-text"

const links = defineArrayMember({ type: "siteLink" })

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Configurações do site",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "navigation",
      title: "Navegação",
      description:
        "Os links do topo do site, na ordem em que aparecem. Entrar, painel e conta são da plataforma e não entram aqui.",
      type: "array",
      of: [links],
    }),
    defineField({
      name: "footer",
      title: "Rodapé",
      type: "object",
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: "columns",
          title: "Colunas de links",
          type: "array",
          of: [
            defineArrayMember({
              name: "footerColumn",
              title: "Coluna",
              type: "object",
              fields: [
                defineField({
                  name: "title",
                  title: "Título",
                  type: "string",
                  validation: (rule) => rule.required(),
                }),
                defineField({
                  name: "links",
                  title: "Links",
                  type: "array",
                  of: [links],
                  validation: (rule) => rule.required().min(1),
                }),
              ],
            }),
          ],
        }),
        defineField({
          name: "social",
          title: "Redes sociais",
          type: "array",
          of: [
            defineArrayMember({
              name: "socialLink",
              title: "Rede social",
              type: "object",
              fields: [
                defineField({
                  name: "network",
                  title: "Rede",
                  type: "string",
                  options: {
                    list: [{ title: "Instagram", value: "instagram" }],
                  },
                  validation: (rule) => rule.required(),
                }),
                defineField({
                  name: "url",
                  title: "Endereço",
                  type: "url",
                  validation: (rule) => hrefRule(rule.required()),
                }),
              ],
              preview: { select: { title: "network", subtitle: "url" } },
            }),
          ],
        }),
        defineField({
          name: "text",
          title: "Texto",
          description: "Um texto curto, como a linha de direitos autorais",
          type: "richText",
          validation: (rule) => rule.required().custom(richTextProblem),
        }),
        defineField({
          name: "development",
          title: "Desenvolvimento",
          type: "object",
          validation: (rule) => rule.required(),
          fields: [
            defineField({
              name: "developedBy",
              title: "Desenvolvido por",
              type: "richText",
              validation: (rule) => rule.required().custom(richTextProblem),
            }),
            defineField({
              name: "repositoryUrl",
              title: "Repositório no GitHub",
              type: "url",
              validation: (rule) => hrefRule(rule.required()),
            }),
            defineField({
              name: "bugReportUrl",
              title: "Formulário para avisar de bugs",
              type: "url",
              validation: (rule) => hrefRule(rule.required()),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "notice",
      title: "Aviso",
      description:
        "Uma mensagem curta no topo de todas as páginas. Vazio, não aparece aviso. Um aviso novo aparece de novo para todo mundo.",
      type: "richText",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Configurações do site" }),
  },
})

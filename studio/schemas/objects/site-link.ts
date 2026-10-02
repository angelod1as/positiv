import { LinkIcon } from "@sanity/icons/Link"
import { defineField, defineType } from "sanity"

import { hrefRule } from "./rich-text"

type SiteLink = { page?: unknown; url?: string }

function targetProblem(link: SiteLink | undefined) {
  if (!link) {
    return undefined
  }

  if (!link.page && !link.url) {
    return "Escolha uma página ou escreva um endereço"
  }

  if (link.page && link.url) {
    return "Use uma página ou um endereço, não os dois"
  }

  return undefined
}

export const siteLink = defineType({
  name: "siteLink",
  title: "Link",
  description: "Um texto que leva a uma página do site ou a um endereço",
  type: "object",
  icon: LinkIcon,
  fields: [
    defineField({
      name: "label",
      title: "Texto",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "page",
      title: "Página",
      description: "Uma página do site. Deixe vazio se usar um endereço.",
      type: "reference",
      to: [{ type: "page" }],
    }),
    defineField({
      name: "url",
      title: "Endereço",
      description:
        "Deixe vazio se escolher uma página. Começando com / (por exemplo /eventos) ou com https://",
      type: "url",
      validation: hrefRule,
    }),
  ],
  validation: (rule) =>
    rule.custom<SiteLink>((link) => targetProblem(link) ?? true),
  preview: {
    select: { title: "label", url: "url", pageTitle: "page.title" },
    prepare: ({ title, url, pageTitle }) => ({
      title,
      subtitle: url ?? pageTitle,
    }),
  },
})

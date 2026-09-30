import { DocumentIcon } from "@sanity/icons/Document"
import { defineField, defineType, getPublishedId } from "sanity"

import { reservedAddresses } from "../../reserved-addresses"

const segment = /^[a-z0-9-]+$/

function addressProblem(address: string) {
  if (address === "/") {
    return undefined
  }

  const [leading, ...segments] = address.split("/")

  if (leading !== "" || !segments.every((part) => segment.test(part))) {
    return "Use / seguido de palavras em minúsculas, números e hífens, separadas por /, sem / no final (por exemplo /sobre/equipe)"
  }

  if (reservedAddresses.includes(segments[0])) {
    return `/${segments[0]} é usado pela plataforma; escolha outro começo para o endereço`
  }

  return undefined
}

export const page = defineType({
  name: "page",
  title: "Página",
  type: "document",
  icon: DocumentIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "address",
      title: "Endereço",
      description:
        "Onde a página fica no site, por exemplo /sobre ou /sobre/equipe. A página inicial é /. Mudar o endereço de uma página publicada quebra os links antigos para ela.",
      type: "string",
      validation: (rule) =>
        rule.required().custom<string>(async (address, context) => {
          if (address === undefined) {
            return true
          }

          const problem = addressProblem(address)

          if (problem) {
            return problem
          }

          const pagesAtAddress = await context
            .getClient({ apiVersion: "2026-09-24" })
            .fetch<number>(
              `count(*[_type == "page" && address == $address && !sanity::versionOf($id)])`,
              {
                address,
                id: getPublishedId(context.document?._id ?? ""),
              },
            )

          return pagesAtAddress > 0 ? "Outra página já usa este endereço" : true
        }),
    }),
  ],
})

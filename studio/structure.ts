import { DocumentsIcon } from "@sanity/icons/Documents"
import { HomeIcon } from "@sanity/icons/Home"
import type { StructureResolver } from "sanity/structure"

import { HOMEPAGE_PAGE_ID } from "./schemas/documents/page"
import { HOMEPAGE_ID } from "./singletons"

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Conteúdo")
    .items([
      S.listItem()
        .title("Página inicial")
        .id(HOMEPAGE_ID)
        .icon(HomeIcon)
        .child(
          S.document()
            .schemaType("homepage")
            .documentId(HOMEPAGE_ID)
            .title("Página inicial"),
        ),
      S.divider(),
      S.listItem()
        .title("Página inicial (nova, ainda não publicada no site)")
        .id(HOMEPAGE_PAGE_ID)
        .icon(HomeIcon)
        .child(
          S.document()
            .schemaType("page")
            .documentId(HOMEPAGE_PAGE_ID)
            .title("Página inicial (nova)"),
        ),
      S.documentTypeListItem("page").title("Páginas").icon(DocumentsIcon),
      S.divider(),
      S.documentTypeListItem("person").title("Pessoas"),
    ])

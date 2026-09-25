import { HomeIcon } from "@sanity/icons/Home"
import type { StructureResolver } from "sanity/structure"

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
      S.documentTypeListItem("person").title("Pessoas"),
    ])

import { BillIcon } from "@sanity/icons/Bill"
import { ClipboardIcon } from "@sanity/icons/Clipboard"
import { CogIcon } from "@sanity/icons/Cog"
import { DashboardIcon } from "@sanity/icons/Dashboard"
import { DocumentsIcon } from "@sanity/icons/Documents"
import { EarthGlobeIcon } from "@sanity/icons/EarthGlobe"
import { EnvelopeIcon } from "@sanity/icons/Envelope"
import { HomeIcon } from "@sanity/icons/Home"
import type { StructureResolver } from "sanity/structure"

import { HOMEPAGE_PAGE_ID } from "./schemas/documents/page"
import {
  EMAIL_TEMPLATES_ID,
  LIKERT_SCALE_ID,
  PAYMENT_MESSAGES_ID,
  SITE_SETTINGS_ID,
} from "./singletons"

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Conteúdo")
    .items([
      S.listItem()
        .title("Site")
        .id("site")
        .icon(EarthGlobeIcon)
        .child(
          S.list()
            .title("Site")
            .items([
              S.listItem()
                .title("Página inicial")
                .id(HOMEPAGE_PAGE_ID)
                .icon(HomeIcon)
                .child(
                  S.document()
                    .schemaType("page")
                    .documentId(HOMEPAGE_PAGE_ID)
                    .title("Página inicial"),
                ),
              S.documentTypeListItem("page").title("Páginas").icon(DocumentsIcon),
              S.listItem()
                .title("Configurações do site")
                .id(SITE_SETTINGS_ID)
                .icon(CogIcon)
                .child(
                  S.document()
                    .schemaType("siteSettings")
                    .documentId(SITE_SETTINGS_ID)
                    .title("Configurações do site"),
                ),
              S.divider(),
              S.documentTypeListItem("person").title("Pessoas"),
            ]),
        ),
      S.listItem()
        .title("Plataforma")
        .id("plataforma")
        .icon(DashboardIcon)
        .child(
          S.list()
            .title("Plataforma")
            .items([
              S.listItem()
                .title("E-mails")
                .id(EMAIL_TEMPLATES_ID)
                .icon(EnvelopeIcon)
                .child(
                  S.document()
                    .schemaType("emailTemplates")
                    .documentId(EMAIL_TEMPLATES_ID)
                    .title("E-mails"),
                ),
              S.listItem()
                .title("Mensagens de pagamento")
                .id(PAYMENT_MESSAGES_ID)
                .icon(BillIcon)
                .child(
                  S.document()
                    .schemaType("paymentMessages")
                    .documentId(PAYMENT_MESSAGES_ID)
                    .title("Mensagens de pagamento"),
                ),
              S.listItem()
                .title("Escala de Likert")
                .id(LIKERT_SCALE_ID)
                .icon(ClipboardIcon)
                .child(
                  S.document()
                    .schemaType("likertScale")
                    .documentId(LIKERT_SCALE_ID)
                    .title("Escala de Likert"),
                ),
            ]),
        ),
    ])

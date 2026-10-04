import { paragraph } from "./page-documents"

export const linkToPage = (label: string, address: string) => ({
  _key: label.toLowerCase(),
  label,
  page: { address },
  url: null,
})

export const linkToUrl = (label: string, url: string) => ({
  _key: label.toLowerCase(),
  label,
  page: null,
  url,
})

export const siteSettingsDocument = (
  overrides: Record<string, unknown> = {},
  footerOverrides: Record<string, unknown> = {},
) => ({
  navigation: [
    linkToPage("Sobre", "/sobre"),
    linkToUrl("Eventos", "/eventos"),
  ],
  footer: {
    columns: [
      {
        _key: "positiv",
        title: "A Positiv",
        links: [linkToPage("Início", "/")],
      },
    ],
    social: [
      {
        _key: "instagram",
        network: "instagram",
        url: "https://instagram.com/positivparty",
      },
    ],
    text: paragraph("© 2025 Positiv. Todos os direitos reservados."),
    ...footerOverrides,
  },
  ...overrides,
})

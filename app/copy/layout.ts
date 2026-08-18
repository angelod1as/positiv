export const headerCopy = {
  prodInDevWarning: "PRODUCTION DATABASE",
  logoAlt: "Logo Positiv",
  greeting: (name: string) => `Olá, ${name}`,
  dashboardTitle: "Dashboard",
  adminTitle: "Área Admin",
  accountTitle: "Conta",
  login: "Entrar",
} as const

export const footerCopy = {
  copyright: `© 2025 Positiv. Todos os direitos reservados.`,
  developedBy: `Este website está em constante desenvolvimento por [Angelo Dias](https://www.angelodias.com.br).`,
  openSource: "Ele é Open Source e aceita colaborações.",
  repository: "Visite nosso repositório.",
  bugReport: (url: string) =>
    `Encontrou um bug? [Clique aqui e nos avise](${url}).`,
  instagramIconAlt: "Instagram icon",
  instagram: "Siga nosso instagram",
} as const

export const newsDialogCopy = {
  title: "News",
  dismiss: "Não mostrar isso novamente",
  trigger: "Veja as novidades do site",
} as const

export const warningBannerCopy = {
  dismiss: "Dismiss warning",
} as const

export const whatsAppButtonCopy = {
  message: "Olá! Vim do site e gostaria de saber mais sobre a Positiv",
  ariaLabel: "Fale conosco pelo WhatsApp",
  iconAlt: "WhatsApp",
  tooltip: "Fale conosco",
} as const

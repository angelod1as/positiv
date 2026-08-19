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
  heading: "O que há de novo",
  dismiss: "Não mostrar isso novamente",
  trigger: "Veja as novidades do site",
  empty: {
    title: "Olha! Um aviso!",
    body: `Através dele você poderá saber sobre as atualizações, resoluções de bugs, e novidades do nosso site.

Ele só aparece quando você está logade **nunca mais** enche o saco se você clicar no botão abaixo.

> "Ah, mas eu quero ler de novo"

Simples, é só clicar no link lá no pé da página.

Assim que a houver uma nova atualização, ele voltará a pular na sua frente — assim você poderá saber todas as nossas novidades!`,
  },
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

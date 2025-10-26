import type { NewsItem } from "./news"

// Helper function to get date relative to today
export function getDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

export function filterAndSortNews(
  items: NewsItem[],
  isAdmin: boolean,
): NewsItem[] {
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  return items
    .filter((item) => item.isActive)
    .filter((item) => item.createdAt > twoWeeksAgo)
    .filter((item) => !item.isAdmin || isAdmin)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// Export helper to check if user has visible news
export function hasVisibleNews(
  isAdmin: boolean,
  newsItems: NewsItem[],
): boolean {
  const filteredNews = filterAndSortNews(newsItems, isAdmin)
  return filteredNews.length > 0
}

// NEWS_VERSION is a timestamp that triggers the news dialog when updated
// Update this to Date.now() whenever adding new news items
export const NEWS_VERSION = 1761506439122

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: "gray-flag",
    title: "⚫ Nova flag cinza disponível",
    content:
      "Agora você pode marcar participantes com flag cinza! Use para indicar pessoas que tiveram flags amarela ou vermelha no passado mas que já foram resolvidas. As notas da flag podem explicar o histórico e motivo da liberação.",
    isAdmin: true,
    createdAt: new Date("2025-10-26T16:00:00"),
    isActive: true,
  },
  {
    id: "race-color",
    title: "🌈 Informações sobre cor ou raça",
    content:
      "Após sugestão de frequentadores, adicionamos nos dados de perfil os dados de cor ou raça. Não utilizaremos essas informações para escolher es participantes, mas elas serão úteis para dados demográficos.",
    isAdmin: false,
    createdAt: new Date("2025-10-23T14:00:00"),
    isActive: true,
  },
  {
    id: "social-spots",
    title: "🤗 Vagas sociais agora nos termos e condições",
    content:
      "Anteriormente, as informações sobre vagas sociais apareciam apenas no email de confirmação de inscrição. Agora, aparecem nos termos e condições — que você pode acessar quando se inscreve pela primeira vez ou clicando no ícone de pessoa no topo superior da página.",
    isAdmin: false,
    createdAt: new Date("2025-10-23T10:00:00"),
    isActive: true,
  },
  {
    id: "spreadsheet-numbers-staff",
    title: "📊 Numeração e coluna Staff nas planilhas",
    content:
      'As planilhas de participantes agora incluem numeração automática (coluna "Nº") e uma coluna "Staff" que identifica visualmente membros da equipe. Facilita conferências e organização!',
    isAdmin: true,
    createdAt: new Date("2025-10-17T10:00:00"), // October 17, 2025, 10:00AM
    isActive: true,
  },
  {
    id: "google-contacts-gender-abbrev",
    title: "📇 Abreviações de gênero no Google Contacts",
    content:
      'Melhorias na formatação de contatos: agora pessoas cis também aparecem com abreviações (MC/HC) quando relevante, e "Pessoa agênera" usa AG. Formatação mais consistente!',
    isAdmin: true,
    createdAt: new Date("2025-10-17T10:15:00"), // October 17, 2025, 10:15AM
    isActive: true,
  },
  {
    id: "banner-homepage-only",
    title: "🏠 Banner agora só na homepage e login",
    content:
      "O banner de avisos importantes agora aparece apenas na homepage e página de login, reduzindo distrações em outras páginas do site.",
    isAdmin: true,
    createdAt: new Date("2025-10-17T10:30:00"), // October 17, 2025, 10:30AM
    isActive: true,
  },
  {
    id: "group-start-4-days",
    title: "📅 Início de grupos agora 4 dias antes",
    content:
      "Ajuste no cálculo automático de datas: o início do período de grupos mudou de 7 para 4 dias antes do evento, alinhado com o processo atual.",
    isAdmin: true,
    createdAt: new Date("2025-10-17T10:45:00"), // October 17, 2025, 10:45AM
    isActive: true,
  },
  // Items older than 2 weeks are removed as per guidelines
]

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
export const NEWS_VERSION = 1736020800000

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: "clickable-event-rows",
    title: "🖱️ Clique nas linhas da tabela de eventos",
    content:
      "Agora você pode clicar diretamente nas linhas da tabela de eventos para visualizar os detalhes! Não é mais necessário procurar pelo botão de visualização - basta clicar em qualquer lugar da linha do evento que você deseja ver.",
    isAdmin: true,
    createdAt: new Date("2026-01-04T18:00:00"),
    isActive: true,
  },
  {
    id: "event-listmonk-sync",
    title: "📧 Sincronização automática com listas de e-mail",
    content:
      "Agora as listas de e-mail do Listmonk são gerenciadas automaticamente! Quando um evento fecha inscrições, uma lista é criada automaticamente com todes es participantes aprovades. Você também pode criar ou atualizar a lista manualmente usando o botão 'Criar Lista' ou 'Atualizar Lista' na página do evento. Se houver alterações nos participantes, um aviso amarelo aparecerá indicando que a lista precisa ser sincronizada.",
    isAdmin: true,
    createdAt: new Date("2025-12-26T18:30:00"),
    isActive: true,
  },
  {
    id: "column-tooltips",
    title: "ℹ️ Ícones de ajuda nas colunas da tabela",
    content:
      "Agora várias colunas da tabela de participantes têm um ícone de informação (ℹ️) ao lado do título. Passe o mouse sobre eles para ver explicações detalhadas sobre o que cada coluna significa - como os diferentes tipos de flags, status de processo, status de presença, e muito mais. Isso vai facilitar o entendimento e uso da tabela!",
    isAdmin: true,
    createdAt: new Date("2025-12-22T14:00:00"),
    isActive: true,
  },
]

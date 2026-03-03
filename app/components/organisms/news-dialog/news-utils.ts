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
export const NEWS_VERSION = 1772539200000

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: "rejected-participants-section",
    title: "🚫 Participantes rejeitades visíveis na página do evento",
    content:
      "A página de cada evento agora mostra uma seção separada com as pessoas rejeitades que se inscreveram. Antes, essas pessoas simplesmente não apareciam na lista — agora estão visíveis para facilitar o acompanhamento.",
    isAdmin: true,
    createdAt: new Date("2026-03-03T12:00:00"),
    isActive: true,
  },
  {
    id: "status-enum-updates",
    title: "🔄 Novos status de processo e presença",
    content:
      "Os status de acompanhamento de eventos foram atualizados. O status \"Não vai\" foi renomeado para \"Desistiu\" (para quem foi selecionade mas desistiu de comparecer). Foram adicionados também dois novos status: \"Não Selecionade\" (inscrite que não foi selecionade para o evento) e \"Não Respondeu\" (candidate que não respondeu aos contatos durante o processo de inscrição).",
    isAdmin: true,
    createdAt: new Date("2026-02-26T12:00:00"),
    isActive: true,
  },
  {
    id: "fix-registration-trigger",
    title: "🔧 Erro ao se inscrever em eventos corrigido",
    content:
      "Corrigido um erro que impedia participantes de se inscreverem em eventos. O fechamento automático das inscrições ao atingir 90 participantes agora funciona corretamente e, mesmo em caso de falha, não bloqueia mais as inscrições.",
    isAdmin: true,
    createdAt: new Date("2026-02-20T13:00:00"),
    isActive: true,
  },
  {
    id: "admin-event-count-default-sort",
    title: "📋 Tabela de participantes ordena por eventos automaticamente",
    content:
      "A coluna \"Total de eventos\" agora carrega com ordenação decrescente por padrão, mostrando as pessoas mais ativas primeiro. Participantes sem histórico de presença aparecem sempre no final da lista.",
    isAdmin: true,
    createdAt: new Date("2026-02-20T12:00:00"),
    isActive: true,
  },
  {
    id: "admin-last-attended-events-count",
    title: "📊 Nova coluna: Últimos eventos (6 últimos)",
    content:
      "Agora as tabelas de participantes e de perfis mostram quantos dos últimos 6 eventos realizados cada pessoa participou. Essa informação ajuda a identificar rapidamente quem está ativo na comunidade e quem não participa há algum tempo.",
    isAdmin: true,
    createdAt: new Date("2026-02-19T12:00:00"),
    isActive: true,
  },
]

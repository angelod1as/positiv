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
export const NEWS_VERSION = 1736729100000

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: "was-selected-for-rotation",
    title: "🔄 Histórico de rodízio preservado",
    content:
      'Agora o sistema guarda se a pessoa foi escolhida para rodízio ("Pulade") mesmo que depois ela compareça ao evento. Na tabela de participantes, a coluna "Escolhide p/ rodízio?" é marcada automaticamente quando você seleciona "Pulade" no status de presença. Isso ajuda a manter o histórico correto de quem foi selecionado para rodízio.',
    isAdmin: true,
    createdAt: new Date("2026-01-12T21:45:00"),
    isActive: true,
  },
  {
    id: "auto-set-paid",
    title: '💰 "Pago?" marcado automaticamente',
    content:
      'Na tabela de participantes, se você adicionar qualquer valor ao campo "Pagamento", a caixa "Pago?" é preenchida automaticamente.',
    isAdmin: true,
    createdAt: new Date("2026-01-11T20:37:00"),
    isActive: true,
  },
  {
    id: "global-profiles-table",
    title: "👥 Nova página de Perfis",
    content:
      "Agora você pode ver todos os perfis cadastrados em uma única tabela! Acesse pelo menu Admin → Perfis. A tabela mostra nome, gênero, orientação, status veterane/novate, flag, cidade, status de aprovação, quantidade de eventos e último evento. Use os filtros nas colunas para encontrar perfis específicos. Essa tabela será incrementada em breve!",
    isAdmin: true,
    createdAt: new Date("2026-01-11T19:37:00"),
    isActive: true,
  },
  {
    id: "removed-unused-date-fields",
    title: "🗑️ Campos de data removidos do formulário de evento",
    content:
      "O formulário de criação/edição de evento foi simplificado! Removemos 3 campos que nunca foram utilizados: 'Data final de inscrições', 'Data de início das entrevistas' e 'Data final das entrevistas'. O fechamento de inscrições continua sendo controlado pelo status do evento.",
    isAdmin: true,
    createdAt: new Date("2026-01-05T17:30:00"),
    isActive: true,
  },
  {
    id: "clickable-event-rows",
    title: "🖱️ Clique nas linhas da tabela de eventos",
    content:
      "Agora você pode clicar diretamente nas linhas da tabela de eventos para visualizar os detalhes! Não é mais necessário procurar pelo botão de visualização - basta clicar em qualquer lugar da linha do evento que você deseja ver.",
    isAdmin: true,
    createdAt: new Date("2026-01-04T18:00:00"),
    isActive: true,
  },
]

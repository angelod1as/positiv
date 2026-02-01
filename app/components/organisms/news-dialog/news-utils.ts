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
export const NEWS_VERSION = 1738411200000

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: "admin-registration-limit-email",
    title: "📧 Notificação automática quando evento atingir limite",
    content:
      "Agora todos os admins recebem um e-mail automático quando um evento atinge o limite de 90 inscrições e tem as inscrições fechadas! O e-mail inclui detalhes do evento, quantidade de participantes e um link direto para a página de participantes. Você só recebe um e-mail por evento (sem duplicatas).",
    isAdmin: true,
    createdAt: new Date("2026-02-01T15:30:00"),
    isActive: true,
  },
  {
    id: "demographics-agender-merged",
    title: "📊 Atualização nos dados demográficos",
    content:
      'Agora os gêneros "agênero" e "não-binárie" são contabilizados como "trans" nos dados demográficos — anteriormente eles eram dados separados. Também corrigimos um bug onde variações sem acento (como "agenera" vs "agênera") eram contadas separadamente.',
    isAdmin: true,
    createdAt: new Date("2026-01-30T10:00:00"),
    isActive: true,
  },
  {
    id: "feedback-form",
    title: "📝 Formulário de Feedback",
    content:
      "Agora você pode enviar seu feedback sobre os eventos e a comunidade! Acesse através do menu principal ou pelo link /feedback. Suas sugestões, críticas e elogios nos ajudam a melhorar sempre.",
    isAdmin: false,
    createdAt: new Date("2026-01-27T12:00:00"),
    isActive: true,
  },
  {
    id: "admin-feedbacks-page",
    title: "📋 Gerenciamento de Feedbacks",
    content:
      "Nova página no painel admin para visualizar todos os feedbacks recebidos! A tabela mostra nome, e-mail, WhatsApp, texto do feedback e se o contato já está verificado no sistema. Acesse pelo menu Admin → Feedbacks ou pelo widget na dashboard.",
    isAdmin: true,
    createdAt: new Date("2026-01-27T12:00:00"),
    isActive: true,
  },
]

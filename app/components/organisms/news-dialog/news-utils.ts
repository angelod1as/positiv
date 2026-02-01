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
export const NEWS_VERSION = 1738336200000

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
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
    id: "pre-opening-reminders",
    title: "⏰ Lembretes antes da abertura de inscrições",
    content:
      "Agora você recebe um email 3 dias antes da abertura das inscrições! Isso te dá tempo para se preparar e não perder a vaga. Lembre-se: as inscrições fecham automaticamente ao atingir 90 inscrites, e apenas 60 pessoas são selecionadas. Se você está inscrite na newsletter, já vai receber os lembretes automaticamente.",
    isAdmin: false,
    createdAt: new Date("2026-01-29T12:00:00"),
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

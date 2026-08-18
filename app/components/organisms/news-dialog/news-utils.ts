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
export const NEWS_VERSION = 1787053941631

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: "candidatura-terminology",
    title: "📝 Inscrição agora se chama candidatura",
    content:
      "Concluir o fluxo de um evento nunca garantiu vaga: a organização escolhe quem vai e entra em contato depois. Para isso ficar claro no texto, o site inteiro passou a falar em candidatura — o botão do evento virou \"Me candidatar\", o último passo virou \"Enviar candidatura\" e, se você mudar de ideia, o botão é \"Cancelar candidatura\".",
    isAdmin: false,
    createdAt: new Date("2026-08-18T12:00:00"),
    isActive: true,
  },
  {
    id: "candidatura-terminology-admin",
    title: "🗂️ Os rótulos do admin acompanham \"candidatura\"",
    content:
      "As tabelas, os filtros, os gráficos e os emails automáticos agora dizem candidatura no lugar de inscrição: o status do evento é \"Candidaturas abertas\" ou \"Candidaturas encerradas\", a aba de participantes mostra \"Candidaturas\" e o histórico de cada pessoa virou \"Histórico de candidaturas\".",
    isAdmin: true,
    createdAt: new Date("2026-08-18T12:00:00"),
    isActive: true,
  },
  {
    id: "cancel-application-closed-event",
    title: "❌ Cancelamento liberado mesmo com candidaturas encerradas",
    content:
      'Se você já tinha se candidatade e as candidaturas do evento encerraram, o botão "Cancelar candidatura" continua disponível no seu painel. Antes, o botão sumia assim que o evento lotava e não dava mais para desistir sozinhe.',
    isAdmin: false,
    createdAt: new Date("2026-08-17T12:00:00"),
    isActive: true,
  },
  {
    id: "no-more-bdsm-editions",
    title: "🎉 Todas as edições agora são no mesmo formato",
    content:
      "Não faremos mais edições BDSM da Positiv. Com isso, a página de consentimento que aparecia antes das regras não existe mais: ao se candidatar, você vai direto para as regras e para o teste. As candidaturas dos eventos antigos continuam do jeitinho que estavam.",
    isAdmin: false,
    createdAt: new Date("2026-08-17T12:00:00"),
    isActive: true,
  },
  {
    id: "event-form-without-event-type",
    title: "🗓️ O formulário de evento não pede mais o tipo",
    content:
      "Como não há mais edições BDSM, o campo \"Tipo de evento\" saiu do formulário de criação e edição de eventos. Os eventos antigos que eram BDSM continuam marcados assim no banco — editar um deles não muda mais essa informação.",
    isAdmin: true,
    createdAt: new Date("2026-08-17T12:00:00"),
    isActive: true,
  },
  {
    id: "dashboard-my-registrations",
    title: "✨ Ficou mais claro onde ver suas candidaturas",
    content:
      "Criar conta no site não te coloca em nenhuma festa — cada evento tem a sua candidatura. Agora o painel começa com a seção \"Eventos em que você se candidatou\", separada dos eventos da Positiv, e cada evento mostra se as candidaturas estão abertas, em breve ou encerradas.",
    isAdmin: false,
    createdAt: new Date("2026-08-17T12:00:00"),
    isActive: true,
  },
  {
    id: "feedback-status-workflow",
    title: "📬 Feedbacks agora podem ser acompanhados e resolvidos",
    content:
      "Cada feedback tem um status: Novo, Em progresso ou Resolvido. Na página de feedbacks dá para mudar o status na própria tabela (clique duas vezes na coluna Status) e filtrar por ele. A visão geral mostra só os feedbacks que ainda não foram resolvidos, e a equipe recebe um aviso no Telegram assim que chega um feedback novo.",
    isAdmin: true,
    createdAt: new Date("2026-08-16T12:00:00"),
    isActive: true,
  },
  {
    id: "rodizio-resets-last-events-count",
    title: "🔄 Rodízio zera a conta dos últimos 6 eventos",
    content:
      "Quando uma pessoa entra no rodízio e não vai ao evento (status \"Pulade (rodízio)\"), a coluna \"Últimos eventos (6 últimos)\" zera e a contagem recomeça a partir dali. Assim quem foi rodiziade aparece na frente na hora de escolher quem entra no próximo evento. A conta só zera depois que o evento do rodízio é marcado como realizado, e o \"Total de eventos\" continua contando o histórico completo.",
    isAdmin: true,
    createdAt: new Date("2026-08-16T12:00:00"),
    isActive: true,
  },
]

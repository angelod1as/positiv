import type { NewsItemContent } from "../news"

export default {
  title: "🔄 Rodízio zera a conta dos últimos 6 eventos",
  content:
    'Quando uma pessoa entra no rodízio e não vai ao evento (status "Pulade (rodízio)"), a coluna "Últimos eventos (6 últimos)" zera e a contagem recomeça a partir dali. Assim quem foi rodiziade aparece na frente na hora de escolher quem entra no próximo evento. A conta só zera depois que o evento do rodízio é marcado como realizado, e o "Total de eventos" continua contando o histórico completo.',
  isAdmin: true,
  createdAt: new Date("2026-08-16T12:00:00"),
} satisfies NewsItemContent

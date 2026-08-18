import type { NewsItemContent } from "../news"

export default {
  title: "📬 Feedbacks agora podem ser acompanhados e resolvidos",
  content:
    "Cada feedback tem um status: Novo, Em progresso ou Resolvido. Na página de feedbacks dá para mudar o status na própria tabela (clique duas vezes na coluna Status) e filtrar por ele. A visão geral mostra só os feedbacks que ainda não foram resolvidos, e a equipe recebe um aviso no Telegram assim que chega um feedback novo.",
  isAdmin: true,
  createdAt: new Date("2026-08-16T12:00:00"),
} satisfies NewsItemContent

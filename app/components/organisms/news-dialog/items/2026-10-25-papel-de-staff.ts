import type { NewsItemContent } from "../news"

export default {
  title: "🧑‍🔧 Novo papel: staff",
  content:
    'Agora existe o papel de staff, para quem trabalha nos eventos sem ser admin. Quem é staff não entra no painel de admin, mas pode se candidatar a qualquer evento aberto pelo "Candidatura direta" ou pelo "Me candidatar". A candidatura entra como vaga de staff: não conta para o limite de candidaturas e funciona mesmo depois que as inscrições fecham. O mesmo vale para quem é admin: sua candidatura agora também entra como vaga de staff. Por enquanto, quem dá o papel de staff é o Angelo via código.',
  isAdmin: true,
  createdAt: new Date("2026-10-25T12:02:00"),
} satisfies NewsItemContent

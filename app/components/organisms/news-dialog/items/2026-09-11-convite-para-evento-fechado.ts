import type { NewsItemContent } from "../news"

export default {
  title: "🎟️ Convide alguém para um evento com inscrições encerradas",
  content:
    "Na página de um evento fechado tem um botão novo, 'Convidar participante'. Você busca a pessoa por nome, nome social, e-mail ou telefone, gera um link e manda para ela. Ela se inscreve sozinha, passando pelas regras e pelo formulário como qualquer outra pessoa, e o evento continua fechado para todo mundo — acabou a corrida de abrir o evento, correr atrás da pessoa e fechar de novo. O link só funciona na conta de quem você escolheu, então não adianta ser repassado, e dá para revogar a qualquer momento.",
  isAdmin: true,
  createdAt: new Date("2026-09-11T12:00:00"),
} satisfies NewsItemContent

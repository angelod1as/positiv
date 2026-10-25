import type { NewsItemContent } from "../news"

export default {
  title: "📋 Lista de veteranos no Listmonk",
  content:
    'A página de Participantes tem um botão novo, "Sincronizar lista de veteranos". Ele monta a lista de Veteranos no Listmonk com quem é veterane e aceitou receber a newsletter: adiciona quem falta, tira quem não se encaixa mais e, no fim, mostra quantas pessoas entraram, saíram e estão na lista. Pode clicar quantas vezes quiser, porque se nada mudou nada acontece. Quem saiu da lista de veteranos por conta própria nunca é adicionade de novo, e o botão não cadastra ninguém novo no Listmonk. Ele só aparece para quem pode gerenciar a newsletter.',
  isAdmin: true,
  createdAt: new Date("2026-10-25T12:03:00"),
} satisfies NewsItemContent

import type { NewsItemContent } from "../news"

export default {
  title: "📄 Todo o texto do site em um lugar só",
  content:
    "Todo o texto que aparece no site saiu de dentro das telas e passou a viver em uma pasta única, um arquivo por área (home, eventos, cadastro, admin). Corrigir uma frase, um título ou um aviso agora é editar esse arquivo — dá para fazer pelo próprio GitHub, no navegador, sem mexer em código e sem instalar nada. A alteração vira uma sugestão que alguém do time revisa antes de ir para o ar. Para quem usa o site, nada mudou de comportamento.",
  isAdmin: true,
  createdAt: new Date("2026-08-19T12:00:00"),
} satisfies NewsItemContent

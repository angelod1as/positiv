import type { EventType } from "~types/database/entities.types"

export const getRulesFormQuestions = (eventType: EventType) => ({
  "leave-no-trace": {
    question:
      "Sobre a limpeza do ambiente e a responsabilidade dos pertences des participantes, é certo dizer:",
    answers: {
      correct: [
        "Cada pessoa é responsável por cuidar de seus pertences e por limpar o ambiente, para manter tudo em ordem e no lugar, independente de ter uma equipe de limpeza que irá limpar depois.",
      ],
      incorrect: [
        "Es participantes não precisam se preocupar com a limpeza do ambiente, afinal, o pessoal do motel vai limpar tudo depois",
        "Os organizadores da festa são 100% responsáveis pela limpeza do ambiente e pelos pertences des participantes",
      ],
    },
  },
  "no-obligation": {
    question:
      "Nossas regras dizem que, como a Positiv é uma festa de gente pelada, todo mundo precisa tirar a roupa durante o evento.",
    answers: {
      correct: [
        "Não. A regra é simples: ninguém é obrigade a nada. Se quiser ficar de roupa, pode, se quiser ficar pelade, pode também",
      ],
      incorrect: [
        "Sim, claro! Por que alguém iria a uma suruba para ficar vestide?",
        "Depende, se você for ume grande gostose, pode ficar vestide",
      ],
    },
  },
  "no-privacy-1": {
    question:
      '"Ainda estamos no meio da festa e já conheci duas pessoas incríveis. Vou convidá-las para irmos embora lá pra casa." Em relação às nossas filosofias, essa frase:',
    answers: {
      correct: [
        "Não está de acordo. O ideal é curtir a festa na própria festa e, principalmente, não tirar ninguém dela antes do fim.",
      ],
      incorrect: [
        "Não tem nenhum problema, afinal, as pessoas tem livre-arbítrio e podem fazer o que quiserem.",
      ],
    },
  },
  "no-privacy-2": {
    question:
      '"A Positiv tem quartos privativos e espaços separados para o sexo."',
    answers: {
      correct: [
        "Essa frase está incorreta. A Positiv tem apenas espaços compartilhados e celebra a coletividade.",
      ],
      incorrect: [
        "Essa frase está correta. A Positiv tem espaços em que as pessoas podem ficar umas com as outras no sigilo.",
        "Essa frase está correta. A Positiv tem quartos com portas fechadas e basta bater na porta para entrar e participar.",
      ],
    },
  },
  "no-speak-1": {
    question:
      "Você encontrou amigos que nunca participaram da Positiv. Você decide contar sobre a festa para eles, sem citar o nome de nenhum participante.",
    answers: {
      correct: [
        "Tudo lindo! Falar sobre a Positiv é essencial pro crescimento da própria Positiv, desde que você não cite nomes nem características de quem esteve na festa com você.",
      ],
      incorrect: [
        "Tudo lindo! Especialmente se você só falar sobre características físicas, como uma tatuagem ou um cabelo diferente.",
        "Tudo péssimo! Você absolutamente não pode falar nunca sobre a Positiv.",
      ],
    },
  },
  "no-speak-2": {
    question:
      "Durante a festa, você lembrou de uma história muito legal que outre participante contou em um evento anterior. Você resolve dizer quem a viveu, já que essa pessoa é uma participante de edições passadas.",
    answers: {
      correct: [
        "A regra é clara: não se fala sobre quem vai à Positiv — mesmo para pessoas que vão à Positiv durante uma Positiv.",
      ],
      incorrect: [
        "A regra é clara: tudo bem falar das pessoas que foram à Positiv para outras pessoas que frequentam a Positiv.",
      ],
    },
  },
  "no-speak-3": {
    question:
      "Uma pessoa resolve dizer que vai à Positiv em um bar, entre pessoas que não vão à festa.",
    answers: {
      correct: [
        "Desde que ela não diga quem vai ou foi à festa com ela, tudo bem — ela pode divulgar sua participação.",
      ],
      incorrect: [
        "Ruim: a pessoa não deve falar de quem vai à Positiv, inclusive dela mesmo.",
        "Tudo bem, isso pode incentivar as pessoas a falarem que também vão à festa, e isso é bom pra todo mundo.",
      ],
    },
  },
  "not-a-club": {
    question:
      '"A Positiv é tipo uma balada: luzes piscando, música alta, muita dança, drinks, e cerveja."',
    answers: {
      correct: [
        "A frase está incorreta. A Positiv se parece mais com um picnic e não tem música alta ou luzes piscando.",
        eventType === "bdsm" 
          ? "A frase está incorreta. Na Positiv BDSM não há álcool ou outras substâncias."
          : "A frase está incorreta. É até possível que haja drinks ou cerveja, mas a moderação é essencial.",
      ],
      incorrect: [
        "A frase está correta. A Positiv é o lugar ideal para eu ir e dançar a noite toda, ainda mais sabendo que vou tomar várias.",
      ],
    },
  },
  phone: {
    question:
      '"Vou usar meu celular na festa, em qualquer lugar da suíte." A afirmação acima está:',
    answers: {
      correct: [
        "Incorreta, o uso dos celulares é permitido apenas na garagem da suíte.",
      ],
      incorrect: [
        "Correta, o uso dos celulares é permitido em qualquer lugar",
        "Incorreta, o uso dos celulares é totalmente proibida",
      ],
    },
  },
  "protection-1": {
    question: '"O uso de camisinha é opcional durante a festa."',
    answers: {
      correct: [
        "A afirmação está incorreta, o uso de camisinha interna ou externa, é obrigatório",
        "A afirmação está incorreta e até mesmo casais que não usam camisinha fora da festa são obrigados a usar durante a festa",
      ],
      incorrect: [
        "A afirmação está correta, porque todes são obrigades a enviar exames de ISTs para os organizadores",
      ],
    },
  },
  "protection-2": {
    question: "Quais afirmações estão corretas?",
    answers: {
      correct: [
        "A Positiv não pede que seus participantes enviem resultados de exames de IST para a organização, mas prega que todes façam regularmente seus acompanhamentos, porque assumimos riscos em frequentar festas como a Positiv",
        "Para interações com mãos e bocas, a Positiv recomenda fortemente que sejam usadas luvas, dental dams e/ou camisinhas.",
      ],
      incorrect: [
        "Nossas regras preveem que, caso uma camisinha escape, fure ou rasgue, que es envolvides não sejam avisades, afinal, é de responsabilidade apenas de quem está usando a camisinha",
        "A Positiv é 100% segura e é impossível contrair uma IST durante o evento.",
      ],
    },
  },
  trigger: {
    question:
      "Você... tá legal? Digo, sua cabeça tá boa? Você entendeu que a Positiv pode trazer vários gatilhos e mexer com bases bem estabelecidas da sua vida? Tipo, é bem mais leve do que parece, mas também pode ser uma coisa muito diferente do que você está acostumade?",
    answers: {
      correct: [
        "Sim, fiz uma autoanálise e tô legal. Entendo meus gatilhos e tô preparade para enfrentar meus medos e inseguranças.",
      ],
      incorrect: [
        "Não, fiz uma autoanálise e não tô 100%. Acho que preciso repensar se consigo aguentar esse tranco.",
      ],
    },
  },
  "yes-is-yes": {
    question: "Selecione a melhor interação segundo nossas regras:",
    answers: {
      correct: [
        'Senti que um clima rolou na festa. Perguntei: posso te dar um beijo? A pessoa consentiu com um "sim". Nos beijamos. Ela perguntou: "posso fazer um cafuné?" e eu disse que sim.',
      ],
      incorrect: [
        "Flertei com uma pessoa na festa, saquei (no ar) o interesse dela, e dei um beijo",
        "A pessoa disse, no grupo do whatsapp, que ia me pegar com força. Cheguei na festa e fui logo roubar um beijo.",
        'A interação de certo grupo chamou minha atenção. Perguntei "posso participar?", e só uma das pessoas respondeu. Participei mesmo assim.',
        "O sexo oral estava rolando, e estava ótimo. Para não perder o clima, só coloquei a camisinha e mandei ver.",
      ],
    },
  },
})

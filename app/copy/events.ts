import type { z } from "zod"
import type { applyToEventSchema } from "~/business/application/application-schemas"

export const rulesCopy = {
  title: "Regras e filosofias",
  intro: `Antes de se candidatar ao nosso evento, precisamos ter certeza que você **leu** e **entendeu** as nossas principais regras e filosofias.

Portanto, criamos esse breve teste! Você só conseguirá se candidatar ao nosso evento se todas as respostas estiverem corretas. _(Quem falou que suruba é bagunça, né?)_

Vamos ao que interessa:`,
  unavailable: "Não conseguimos carregar as regras agora. Recarregue a página em alguns minutos.",
} as const

export const rulesDialogCopy = {
  title: "Confirmar candidatura",
  notesPrompt:
    "Se você tiver alguma nota ou comentário que gostaria que as pessoas administradoras soubessem, escreva-as abaixo:",
  notesPlaceholder: "O que quer que a gente saiba?",
  confirmation:
    "Você acertou tudo! Agora só falta clicar nesse botãozinho abaixo e confirmar sua candidatura.",
  emailNotice:
    "Você vai receber um email com os dados do evento, salve na sua agenda!",
  confirmLabel: "🎉 Confirmar!",
  cancelLabel: "😢 Cancelar",
} as const

export const rulesQuizCopy = {
  title: "✅ Hora do teste! ✅",
  skipQuizDev: "Pular quiz (dev)",
  shuffleNotice: "(As questões e respostas são automaticamente embaralhadas)",
  veteranWager:
    "Você é veterane? Adivinha! Se acertar estas três perguntas de primeira, não precisa responder as outras. Boa sorte!",
  veteranLostWager: "Acho que você precisa relembrar as regras...",
  answerErrors: {
    wrongAnswer: "Você escolheu a resposta errada",
    noneCorrect: "Nenhuma das respostas selecionadas está correta",
    missingCorrect: "Você não selecionou todas as respostas corretas",
    hasIncorrect: "Você selecionou uma ou mais respostas incorretas",
  },
} as const

export const rulesStatusNoticeCopy = {
  title: "Inscrições indisponíveis",
  Cancelled: "Este evento foi cancelado.",
  Completed: "Este evento já aconteceu.",
} as const

export const eventListCopy = {
  appliedHeading: "Eventos em que você se candidatou",
  availableHeading: "Eventos da Positiv",
} as const

export const eventCardCopy = {
  adminView: "Ver evento",
  scheduled: "Candidaturas em breve",
  closed: "Candidaturas encerradas",
  apply: "Me candidatar",
  directApply: "Candidatura direta",
  comingSoon: "Candidate-se em breve",
  cancel: {
    trigger: "Cancelar candidatura",
    title: "Cancelar candidatura",
    description: "Você tem certeza que deseja cancelar sua candidatura?",
    reasonLabel: "Quer contar por que está cancelando? (opcional)",
    reasonPlaceholder: "Seu motivo nos ajuda a melhorar os próximos eventos",
    confirmLabel: "😢 Cancelar",
    cancelLabel: "🎉 Voltar",
  },
  paidCancel: {
    hint: "Seu pagamento já foi confirmado, então o cancelamento é feito com a nossa equipe.",
    trigger: "Cancelar pelo WhatsApp",
    whatsappMessage: (eventTitle?: string | null) =>
      eventTitle
        ? `Oi! Paguei minha inscrição no evento "${eventTitle}" e preciso cancelar.`
        : "Oi! Paguei minha inscrição em um evento e preciso cancelar.",
  },
  payment: {
    pending: "Pagamento pendente",
    paid: "Pago",
    pay: "Pagar",
  },
} as const

export const eventApplicationCopy = {
  title: "Quase lá!",
  intro: `Parabéns, você acertou tudo! Essa é a última etapa: precisamos de algumas informações específicas à candidatura nesse evento.

Ao clicar no botão "Enviar candidatura", sua candidatura será enviada (óbvio) e você irá receber um email com os dados do evento, salve na sua agenda!

(O email pode demorar uns minutos para chegar)`,
  labels: {
    notes:
      "Você tem alguma nota ou comentário que gostaria que as pessoas administradoras soubessem?",
    referrals: "Há alguma pessoa que você queira indicar? Por quê?",
    referred: "Você foi indicade por alguém? Diga nomes!",
    companions:
      "Você pretende ir acompanhade? Se sim, nos diga o nome completo da(s) pessoa(s).",
    bond: "Se a pessoa que você quer ir junte não for, você ainda assim quer ir no evento?",
  } as const satisfies Partial<
    Record<keyof z.infer<typeof applyToEventSchema>, string>
  >,
  descriptions: {
    notes: "Você tem algum aviso, lembrete, ideia, ou sugestão?",
    referrals:
      "Diga os nomes completos daquelas pessoas que você acha que têm tudo a ver com a gente e que querem muito participar — não esqueça de escrever a razão.",
    referred:
      'Se ninguém te indicou, escreva "ninguém". Diga os nomes completos de quem te indicou a Positiv — precisamos saber se foi uma indicação formal ("tem tudo a ver com você") ou informal ("ouvi numa mesa de bar").',
    companions: "Diga pra gente se você vai de galera — e quem é esse pessoal.",
    bond: "Se, pra você, tudo bem se você for selecionade e elas não, selecione a caixinha acima.",
  } as const satisfies Partial<
    Record<keyof z.infer<typeof applyToEventSchema>, string>
  >,
  submitLabel: "🎉 Enviar candidatura!",
  quizExpired:
    "Faz um tempo que você respondeu o quiz de regras. Responda de novo e sua candidatura segue daqui.",
  likertRequired:
    "Antes de se inscrever, responda a Escala de Likert. Levando você até ela…",
  toasts: {
    success: {
      message: "Candidatura enviada com sucesso",
      description:
        "Você receberá as informações do evento em seu email (pode demorar uns minutos)",
    },
    emailFailed: {
      message: "Não conseguimos enviar o e-mail",
      description:
        "Houve um problema no envio do email, mas não se preocupe - sua candidatura foi registrada.",
    },
  },
} as const

type RulesQuestion = {
  question: string
  answers: {
    correct: Record<string, string>
    incorrect: Record<string, string>
  }
}

export const rulesQuestionsCopy = {
  "leave-no-trace": {
    question:
      "Sobre limpeza do ambiente e a responsabilidade dos pertences des participantes, é certo dizer:",
    answers: {
      correct: {
        everyoneCleans:
          "Cada pessoa é responsável por cuidar de seus pertences e por limpar o ambiente, para manter tudo em ordem e no lugar, independente de ter uma equipe de limpeza que irá limpar depois.",
      },
      incorrect: {
        motelCleans:
          "Es participantes não precisam se preocupar com a limpeza do ambiente, afinal, o pessoal do motel vai limpar tudo depois",
        organizersClean:
          "Os organizadores da festa são 100% responsáveis pela limpeza do ambiente e pelos pertences des participantes",
      },
    },
  },
  "no-obligation": {
    question:
      "Nossas regras dizem que, como a Positiv é uma festa de gente pelada, todo mundo precisa tirar a roupa durante o evento.",
    answers: {
      correct: {
        nobodyIsObliged:
          "Não. A regra é simples: ninguém é obrigade a nada. Se quiser ficar de roupa, pode, se quiser ficar pelade, pode também",
      },
      incorrect: {
        everyoneUndresses:
          "Sim, claro! Por que alguém iria a uma suruba para ficar vestide?",
        dependsOnLooks:
          "Depende, se você for ume grande gostose, pode ficar vestide",
      },
    },
  },
  "no-privacy-1": {
    question:
      '"Ainda estamos no meio da festa e já conheci duas pessoas incríveis. Vou convidá-las para irmos embora lá pra casa." Em relação às nossas filosofias, essa frase:',
    answers: {
      correct: {
        stayAtTheParty:
          "Não está de acordo. O ideal é curtir a festa na própria festa e, principalmente, não tirar ninguém dela antes do fim.",
      },
      incorrect: {
        freeWill:
          "Não tem nenhum problema, afinal, as pessoas tem livre-arbítrio e podem fazer o que quiserem.",
      },
    },
  },
  "no-privacy-2": {
    question:
      '"A Positiv tem quartos privativos e espaços separados para o sexo."',
    answers: {
      correct: {
        sharedSpacesOnly:
          "Essa frase está incorreta. A Positiv tem apenas espaços compartilhados e celebra a coletividade.",
      },
      incorrect: {
        secretSpaces:
          "Essa frase está correta. A Positiv tem espaços em que as pessoas podem ficar umas com as outras no sigilo.",
        closedRooms:
          "Essa frase está correta. A Positiv tem quartos com portas fechadas e basta bater na porta para entrar e participar.",
      },
    },
  },
  "no-speak-1": {
    question:
      "Você encontrou amigos que nunca participaram da Positiv. Você decide contar sobre a festa para eles, sem citar o nome de nenhum participante.",
    answers: {
      correct: {
        noNamesNoTraits:
          "Tudo lindo! Falar sobre a Positiv é essencial pro crescimento da própria Positiv, desde que você não cite nomes nem características de quem esteve na festa com você.",
      },
      incorrect: {
        physicalTraitsAreFine:
          "Tudo lindo! Especialmente se você só falar sobre características físicas, como uma tatuagem ou um cabelo diferente.",
        neverSpeakAtAll:
          "Tudo péssimo! Você absolutamente não pode falar nunca sobre a Positiv.",
      },
    },
  },
  "no-speak-2": {
    question:
      "Durante a festa, você lembrou de uma história muito legal que outre participante contou em um evento anterior. Você resolve dizer quem a viveu, já que essa pessoa é uma participante de edições passadas.",
    answers: {
      correct: {
        neverNamesEvenInside:
          "A regra é clara: não se fala sobre quem vai à Positiv — mesmo para pessoas que vão à Positiv durante uma Positiv.",
      },
      incorrect: {
        namesAreFineInside:
          "A regra é clara: tudo bem falar das pessoas que foram à Positiv para outras pessoas que frequentam a Positiv.",
      },
    },
  },
  "no-speak-3": {
    question:
      "Uma pessoa resolve dizer que vai à Positiv em um bar, entre pessoas que não vão à festa.",
    answers: {
      correct: {
        ownParticipationIsFine:
          "Desde que ela não diga quem vai ou foi à festa com ela, tudo bem — ela pode divulgar sua participação.",
      },
      incorrect: {
        notEvenHerself:
          "Ruim: a pessoa não deve falar de quem vai à Positiv, inclusive dela mesmo.",
        encouragesOthers:
          "Tudo bem, isso pode incentivar as pessoas a falarem que também vão à festa, e isso é bom pra todo mundo.",
      },
    },
  },
  "not-a-club": {
    question:
      '"A Positiv é tipo uma balada: luzes piscando, música alta, muita dança, drinks, e cerveja."',
    answers: {
      correct: {
        moreLikeAPicnic:
          "A frase está incorreta. A Positiv se parece mais com um picnic e não tem música alta ou luzes piscando.",
        drinksInModeration:
          "A frase está incorreta. É até possível que haja drinks ou cerveja, mas a moderação é essencial.",
      },
      incorrect: {
        danceAllNight:
          "A frase está correta. A Positiv é o lugar ideal para eu ir e dançar a noite toda, ainda mais sabendo que vou tomar várias.",
      },
    },
  },
  phone: {
    question:
      '"Vou usar meu celular na festa, em qualquer lugar da suíte." A afirmação acima está:',
    answers: {
      correct: {
        garageOnly:
          "Incorreta, o uso dos celulares é permitido apenas na garagem da suíte.",
      },
      incorrect: {
        anywhere: "Correta, o uso dos celulares é permitido em qualquer lugar",
        neverAllowed: "Incorreta, o uso dos celulares é totalmente proibido.",
      },
    },
  },
  "protection-1": {
    question: '"O uso de camisinha é opcional durante a festa."',
    answers: {
      correct: {
        condomIsMandatory:
          "A afirmação está incorreta, o uso de camisinha interna ou externa, é obrigatório",
        couplesToo:
          "A afirmação está incorreta e até mesmo casais que não usam camisinha fora da festa são obrigados a usar durante a festa",
      },
      incorrect: {
        testsInsteadOfCondoms:
          "A afirmação está correta, porque todes são obrigades a enviar exames de ISTs para os organizadores",
      },
    },
  },
  "protection-2": {
    question: "Quais afirmações estão corretas?",
    answers: {
      correct: {
        regularTesting:
          "A Positiv não pede que seus participantes enviem resultados de exames de IST para a organização, mas prega que todes façam regularmente seus acompanhamentos, porque assumimos riscos em frequentar festas como a Positiv",
        glovesAndDams:
          "Para interações com mãos e bocas, a Positiv recomenda fortemente que sejam usadas luvas, dental dams e/ou camisinhas.",
      },
      incorrect: {
        noNeedToWarn:
          "Nossas regras preveem que, caso uma camisinha escape, fure ou rasgue, que es envolvides não sejam avisades, afinal, é de responsabilidade apenas de quem está usando a camisinha",
        completelySafe:
          "A Positiv é 100% segura e é impossível contrair uma IST durante o evento.",
      },
    },
  },
  trigger: {
    question:
      "Você... tá legal? Digo, sua cabeça tá boa? Você entendeu que a Positiv pode trazer vários gatilhos e mexer com bases bem estabelecidas da sua vida? Tipo, é bem mais leve do que parece, mas também pode ser uma coisa muito diferente do que você está acostumade?",
    answers: {
      correct: {
        readyForIt:
          "Sim, fiz uma autoanálise e tô legal. Entendo meus gatilhos e tô preparade para enfrentar meus medos e inseguranças.",
      },
      incorrect: {
        needToRethink:
          "Não, fiz uma autoanálise e não tô 100%. Acho que preciso repensar se consigo aguentar esse tranco.",
      },
    },
  },
  "yes-is-yes": {
    question: "Selecione a melhor interação segundo nossas regras:",
    answers: {
      correct: {
        askedAndConsented:
          'Senti que um clima rolou na festa. Perguntei: posso te dar um beijo? A pessoa consentiu com um "sim". Nos beijamos. Ela perguntou: "posso fazer um cafuné?" e eu disse que sim.',
      },
      incorrect: {
        assumedInterest:
          "Flertei com uma pessoa na festa, saquei (no ar) o interesse dela, e dei um beijo",
        whatsappPromise:
          "A pessoa disse, no grupo do whatsapp, que ia me pegar com força. Cheguei na festa e fui logo roubar um beijo.",
        partialGroupConsent:
          'A interação de certo grupo chamou minha atenção. Perguntei "posso participar?", e só uma das pessoas respondeu. Participei mesmo assim.',
        escalatedWithoutAsking:
          "O sexo oral estava rolando, e estava ótimo. Para não perder o clima, só coloquei a camisinha e mandei ver.",
      },
    },
  },
  "body-positive": {
    question:
      "A respeito das pessoas que vão à Positiv e da maneira como es participantes devem se portar, é certo dizer que:",
    answers: {
      correct: {
        bodyPositiveName:
          "A Positiv tem esse nome, também, por conta do movimento body-positive, uma alusão à quebra dos padrões que a sociedade impõe, à aceitação ao próprio corpo e à conscientização de que corpos dissidentes são desejáveis e desejantes.",
        selfQuestioning:
          "Estar numa Positiv exige um autoquestionamento se nos sentimos abertes e prontes para estar em um ambiente E interagir (sexualmente ou não) com uma pluralidade de corpos, raças, cores, etnias.",
        expandDesire:
          "Quase todos nós moldamos nosso interesse desde pequenes com uma enxurrada de regras sociais que limitam o que é belo e desejável. É importante que cada participante tenha consciência disso e busque expandir seus conceitos.",
      },
      incorrect: {
        standardAestheticOnly:
          'A Positiv foi pensada, majoritariamente, para pessoas que se enquadram numa estética "padrão". Portanto, nosso público não é plural, nem conta com corpos dissidentes.',
        noResponsibilityForOthers:
          "Como se trata de uma festa, nenhum participante precisa se preocupar com outras pessoas, ou como elas se sentem, se estão ou não excluídas. Se eu encontrar alguém meio de fora de uma rodinha, isolade, não é minha responsabilidade falar com a pessoa ou perguntar como ela está.",
      },
    },
  },
} as const satisfies Record<string, RulesQuestion>

export const eventStatusBadgeCopy = {
  open: "Candidaturas abertas",
  scheduled: "Em breve",
  closed: "Candidaturas encerradas",
} as const

export const applicationConfirmationCopy = {
  title: "Candidatura enviada! 🎉",
  received: "Recebemos sua candidatura para esse evento.",
  warning: `Mas atenção: **uma candidatura não garante uma vaga.** Agora a organização seleciona quem vai e entra em contato via Whatsapp. Somos uma equipe minúscula que conversa com cada pessoa candidata, então o processo leva tempo.`,
  emailOnTheWay: `Enquanto isso, um e-mail com os detalhes do evento está a caminho — ele pode demorar alguns minutos para chegar, e vale olhar a caixa de spam.`,
  backToDashboard: "Voltar para o painel",
} as const

export const inviteCopy = {
  invalid: {
    title: "Convite inválido",
    body: `Esse convite não existe mais ou foi cancelado.

Se você acha que é engano, fale com a organização.`,
  },
  wrongPerson: {
    title: "Esse convite não é seu",
    body: `Esse convite foi feito para outra pessoa e só funciona na conta dela.

Se ele era para você, entre com a conta que recebeu o convite.`,
  },
  backToDashboard: "Voltar para o painel",
} as const

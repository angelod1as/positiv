type RulesAlert = {
  title: string
  body: string
}

type RulesSection = {
  heading: string
  body: string
  alert?: RulesAlert
}

const rulesSections: readonly RulesSection[] = [
  {
    heading: "🚨 Nenhuma pessoa é obrigada a nada 🚨",
    body: `“Você não é todo mundo”, já dizia minha mãe.

Se, durante toda a nossa experiência, você não quiser tomar parte em alguma coisa, **simplesmente não o faça**.

Se você não quiser conversar durante o evento, não converse. Se não quiser mandar nude no grupo do whatsapp, não mande. Se não quiser andar pelade na festa, não ande. Se não quiser comer os deliciosos quitutes que todo mundo vai levar, o azar é seu, porém, não coma.

Ninguém é obrigade a **nada**.

#### Claro, há excessões:

- Beber água;
- Seguir as regras;
- Responder todas essas questões corretamente.

Se, em qualquer parte do processo, você achar que não quer mais participar, apenas saia, sem ressentimentos (mas veja nossa política de reembolso para não ter nenhum susto).`,
  },
  {
    heading: "🤫 Você não fala sobre quem vai à Positiv 🤫",
    body: `Um de nossos pilares é a **privacidade de nossos participantes**.

Portanto, **não comentamos** sobre pessoas que conhecemos na festa ou no grupo.

Algumas pessoas têm empregos, relações familiares ou imagens públicas que podem ser afetadas negativamente se sua presença nas festas for revelada.

Lembre-se sempre: trate todas as pessoas com respeito e cuidado. Elus estão ali para se divertirem, assim como você, e tem vivências e prioridades que podem ser diferentes das suas.`,
    alert: {
      title: "🤫 Ninguém sabe até todo mundo saber 🤫",
      body: `Nunca falamos quem vai à uma festa antes do grupo do WhatsApp ser criado. Assim, todo mundo fica sabendo — ao mesmo tempo — quem vai ao mesmo evento.

Existem pouquíssimas — mesmo, quase nenhuma — excessões à essa regra.

"Ah, mas como vou saber se meu chefe vai estar na mesma festa que eu?" Do mesmo jeito que todo mundo: entrando no grupo do WhatsApp e lhe vendo lá. Falar para você que elu está na festa é um baita problema de privacidade, não acha?`,
    },
  },
  {
    heading: "👍 Apenas SIM é SIM 👍",
    body: `Essa é nossa **regra de ouro** do rolê.

- Ficou na dúvida? É **não**;
- Foi um não, que pareceu um sim? É **não**;
- “Ah, já fiquei outras vezes...” é **não**;
- Disse que ficava para depois? é **não**;
- A pessoa consentiu um beijo, mas pareceu desconfortável? **Afaste-se**!

A melhor forma para QUALQUER interação na festa é pedir por **consentimento**.

- Posso te abraçar?
- Posso te beijar?
- Quer ir para um lugar mais privado?
- Posso ver vcs transando?
- Você se importa se eu ficar aqui?

**Perguntar não dói**. Muita gente acha que perguntar vai quebrar o clima, mas, acreditem, um rolê **seguro** faz tudo ficar muito mais sexy!

Ah, e atenção: O consentimento de um beijo não vale para outras ações. Portanto, a cada movimento com a(s) pessoa(s), é preciso pedir o consentimento.`,
    alert: {
      title: "👀 Olhar tira pedaço, sim! 👀",
      body: `Sim, a gente sabe que tem muita gente gostosa na festa... E não somos socializades para entendermos o corpo nu como algo "normal" e muito menos a ver interações sexuais de outros (exceto pelo pornô).

Mas todas as pessoas do grupo designadas mulheres ao nascimento e/ou de gênero feminino já sofreram com pessoas encarando seus corpos, pegando neles e os desrespeitando.

Sabemos que é difícil ver algo lindo, como um corpo nu, e não se fixar naquilo. Mas lembrem que a experiência de ser encarade pode ser muito ruim para muita gente. Em algumas festas tivemos relatos de pessoas que se sentiram "violadas” pelo olhar fixo de alguém e queremos conscientizar, principalmente os homens cis, dessa experiência, porque muitos nunca nem pensaram a respeito.`,
    },
  },
  {
    heading: "🥡 A Positiv não é marmitaria 🥡",
    body: `Nós fazemos uma festa sex- e body-Positiv.

Diferente de uma casa de swing, **não há lugares privativos pra transar**.

A ideia da festa é justamente normalizar a nudez, o sexo, e a sexualidade. Sexo não é tabu.

Sabemos que nem todos são exibicionistas (e até existem uns cantos mais escondidinhos), porém é importante saber que nessa festa só há privacidade nos banheiros.

"Ah, mas eu tenho vergonha de transar com outras pessoas vendo". Então, talvez, a Positiv não seja para você, ou você pode ajustar suas expectativas para simplesmente não transar na festa.

“Ah, encontrei uma pessoa legal na festa e vou levá-la pra casa”: **por favor, não**. Se você quiser chamá-la para um rolê depois que tudo acabar, beleza. Não tirem as pessoas da festa — privando-as de outras experiências — para ter um espaço a sós com você.

Isso é mal-visto pois não somos uma marmitaria, uma festa agenciadora de casais e trisais, que saem do público para curtir seu momento no sigilo. Somos uma exaltação do público, do compartilhado, e da beleza que é a variedade de pessoas.

Respeito, por favor.`,
  },
  {
    heading: "😷 Proteção e saúde 😷",
    body: `**Camisinha sempre e exames atualizados.**

Recomendamos o uso de preservativos para **qualquer** interação sexual.

Nas interações pênis/vagina e pênis/ânus — indepentente dos materiais —, a camisinha é completamente **obrigatória** e **não tem conversa** — qualquer problema com essa regra pode incorrer em ações legais (isso, polícia te levando seminu do motel porque você tirou a camisinha durante a transa).

A gente sempre pede para que casais usem camisinha mesmo se transem sem em casa, porém quase nunca os casais o fazem… Por favor, se for um casal, respeite nossa regra.

**Recomendamos** o uso de luvas (ou camisinhas) para interações que envolvam mãos, e dental dams ou camisinhas cortadas para sexo oral.

Não fazemos distinção: use a camisinha que preferir, seja ela interna ou externa — aliás, esse é o melhor termo: “camisinha externa” ou “camisinha interna”.

Ah, esperamos que todes possam fazer um exame de ISTs antes da festa — em SP você consegue fazer de graça, rapidinho, pelo SUS. Nós não pedimos exames, porque isso poderia ser discriminatório, mas indicamos que todes façam seus controles regularmente.`,
    alert: {
      title: "🍆 A capa pode escapar... 🍆",
      body: `Às vezes, a camisinha escapa — sim, aconteceu, acontece, acontecerá.

O que a gente espera de você: pare TUDO o que estiver acontecendo e notifique as pessoas ao seu redor do que rolou. É um simples “olha, a camisinha escapou, ela tá aqui, vou colocar aqui do lado e pegar outra”.

Se a camisinha escapou dentro da pessoa, a conduta é a mesma, e vale o reforço na importância de testes de IST e, dependendo do caso, a famosa pílula do dia seguinte.

Acidentes acontecem; o que a gente quer é evitar mal-entendidos ou situações que podem gerar stress (como alguém achar que você tirou a camisinha no meio do sexo, o tal do stealthing, que é CRIME).

Numa suruba, você é tão responsável pelo seu corpo quanto pelos corpos de quem transa.`,
    },
  },
  {
    heading: "📸 Sem celular e sem fotos 📸",
    body: `Usar o celular e tirar fotos nas áreas do evento é **expressamente proibido**.

O acesso ao celular só é permitido na garagem da suíte.

- “Ah mas eu quero tirar selfies durante a festa”: não;
- “Ah mas eu quero fazer umas fotos trepando com meu crush”: não;
- “Ah mas”: não.`,
  },
  {
    heading: "💪 Experiência intensa 💪",
    body: `Por mais que nossa mensagem seja de tranquilidade, aceitação e paz, sabemos que um evento como o nosso possa ser intenso demais para algumas pessoas.

Portanto, perguntamos sempre: você está num bom lugar mental para participar de algo que vai **com certeza** desafiar sua zona de conforto?

A Positiv pode ser transformadora — já ouvimos isso de pessoas participantes — mas também pode ativar vários gatilhos. Portanto, saiba que você poderá se expôr a inúmeras sensações e sentimentos. Exemplos:

- Durante a festa a música ambiente se mescla com o som de gemidos. Como você lida com isso?
- É possível que você esteja conversando tranquilamente e, de repente, comecem a transar ali do seu lado. E agora?
- Uma pessoa se aproximou de você, olhou em seus olhos, e perguntou se pode te dar um beijo. Você não quer. Como você age?

Essas perguntas hipotéticas — porém baseadas em casos reais — podem criar cenários apocalípticos na mente de pessoas ansiosas, mas servem mais para uma autoanálise e uma reflexão do tipo: estou pronto para ser desafiade?`,
  },
  {
    heading: "🗑️ Não deixe rastros 🧼🫧",
    body: `Nossa missão é deixar o espaço, no fim da festa, do mesmo jeito que o encontramos quando chegamos.

A manutenção do ambiente é de responsabilidade de TODES — não só das pessoas administradoras

#### Limpeza

Esperamos das pessoas participantes que recolham seu próprio lixo — seja ele migalhas de comida que caíram no chão, uma embalagem de lubrificante que acabou, ou uma camisinha usada.

A gente tá cansado de recolher camisinha usada no fim da festa. Sério.

#### Trouxe? Leve.

Primeiro: **não temos achados e perdidos**. Os itens esquecidos no espaço do evento **ficam no espaço do evento**.

Segundo: suas coisas são de sua responsabilidade, **inclusive suas comidas e bebidas**. Levou à festa um delicioso bolo e sobrou um pedaço? **Leve embora**.

A comida que não for retirada será **descartada**, e isso é péssimo. Fica nas mãos das pessoas administradoras a responsabilidade de organizar o espaço e a dor na consciência de jogar comida fora.

Se você não pode levar sua comida embora, tome você mesme a decisão de descartá-la.`,
  },
  {
    heading: "🕺 Não somos uma balada 🪩",
    body: `A palavra "festa" ou "evento" pode confundir algumas pessoas. Não somos uma balada — o evento é de dia, tem piscina, não tem música alta. É muito mais um picnic ou um churrasco com as pessoas amigas.

Tenha isso em mente ao se inscrever — não somos nada parecidos com casas de swing ou festas liberais. Não tem pista de dança, nem drink que pisca.`,
  },
]

export const rulesCopy = {
  title: "Regras e filosofias",
  intro: `Antes de se inscrever em nosso evento, precisamos ter certeza que você **leu** e **entendeu** as nossas principais regras e filosofias.

Portanto, criamos esse breve teste! Você só conseguirá se inscrever em nosso evento se todas as respostas estiverem corretas. _(Quem falou que suruba é bagunça, né?)_

Vamos ao que interessa:`,
  sections: rulesSections,
} as const

export const rulesDialogCopy = {
  title: "Confirmar inscrição",
  notesPrompt:
    "Se você tiver alguma nota ou comentário que gostaria que as pessoas administradoras soubessem, escreva-as abaixo:",
  notesPlaceholder: "O que quer que a gente saiba?",
  confirmation:
    "Você acertou tudo! Agora só falta clicar nesse botãozinho abaixo e confirmar sua inscrição.",
  emailNotice:
    "Você vai receber um email com os dados do evento, salve na sua agenda!",
  confirmLabel: "🎉 Confirmar!",
  cancelLabel: "😢 Cancelar",
} as const

export const rulesQuizCopy = {
  title: "✅ Hora do teste! ✅",
  shuffleNotice: "(As questões e respostas são automaticamente embaralhadas)",
  answerErrors: {
    wrongAnswer: "Você escolheu a resposta errada",
    noneCorrect: "Nenhuma das respostas selecionadas está correta",
    missingCorrect: "Você não selecionou todas as respostas corretas",
    hasIncorrect: "Você selecionou uma ou mais respostas incorretas",
  },
} as const

export const eventListCopy = {
  appliedHeading: "Eventos em que você se candidatou",
  availableHeading: "Eventos da Positiv",
} as const

export const eventCardCopy = {
  adminView: "Ver evento",
  scheduled: "Inscrições em breve",
  closed: "Candidaturas encerradas",
  apply: "Me candidatar",
  directApply: "Candidatura direta (admin)",
  comingSoon: "Candidaturas em breve",
  cancel: {
    trigger: "Cancelar candidatura",
    title: "Cancelar candidatura",
    description: "Você tem certeza que deseja cancelar sua candidatura?",
    confirmLabel: "😢 Cancelar",
    cancelLabel: "🎉 Voltar",
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
  },
  descriptions: {
    notes: "Você tem algum aviso, lembrete, ideia, ou sugestão?",
    referrals:
      "Diga os nomes completos daquelas pessoas que você acha que têm tudo a ver com a gente e que querem muito participar — não esqueça de escrever a razão.",
    referred:
      'Se ninguém te indicou, escreva "ninguém". Diga os nomes completos de quem te indicou a Positiv — precisamos saber se foi uma indicação formal ("tem tudo a ver com você") ou informal ("ouvi numa mesa de bar").',
    companions: "Diga pra gente se você vai de galera — e quem é esse pessoal.",
    bond: "Se, pra você, tudo bem se você for selecionade e elas não, selecione a caixinha acima.",
  },
  submitLabel: "🎉 Enviar candidatura!",
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

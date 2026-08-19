export const dashboardCopy = {
  termsRequired: "Você precisa aceitar os termos antes de continuar",
  cancelFailed: "Ops, seu cancelamento deu errado. Comunique o administrador.",
  loadFailed: "Não foi possível carregar os eventos.",
  welcome: {
    title: "Sua conta está pronta",
    body: "Mas ter conta não te coloca em nenhuma festa. Escolha um evento abaixo e envie sua candidatura.",
  },
  directApply: {
    notAllowed: "Você não tem permissão para se candidatar diretamente",
    eventNotFound: "Evento não encontrado.",
    failed: "Sua candidatura teve um erro, tente novamente.",
  },
  emptyApplied: "Você não tem nenhuma candidatura no momento.",
  emptyAvailable: "Nenhum evento por aqui no momento.",
  calendarFailed:
    "Erro ao gerar evento no calendário, tente novamente mais tarde",
} as const

type TermsSection = {
  heading: string
  body: string
}

const termsSections: readonly TermsSection[] = [
  {
    heading: "O que é a Positiv?",
    body: `A Positiv é idealizada por Ju e Angelo para ser um local de segurança, acolhimento e pertencimento, onde pessoas de todas as identidades de gênero e orientações sexuais possam explorar seus corpos e sexualidade, se assim quiserem. É um evento apenas para gente maior de 18 anos, pensado, especificamente para pessoas não-monogâmicas e LGBTQIA+.

"Ah, sou uma pessoa cis hétero e não mono, posso ir?" Existem muitos espaços pensados para pessoas cis hétero e realmente queremos construir uma experiência coletiva que não seja cisheteronormativa. Portanto, se for uma pessoa cis hétero, as chances de você ser selecionade para participar são baixas. E, por favor, não minta sobre sua identidade ou orientação sexual.

Costumamos dizer que nosso evento é, também, uma suruba, mas o foco principal não é o sexo. É um encontro entre amigos como outro qualquer, em que as pessoas podem estar peladas e fazer sexo, se todes envolvides consentirem. Não é necessário ficar pelade. Não é necessário transar. É um evento onde tudo o que for consentido pode acontecer, inclusive, nada.

É importante você saber que realizamos a Positiv em uma suíte de motel de três andares (tem muita escada), perto da Raposo Tavares e ajudamos as pessoas com organização de caronas. Você também vai precisar levar um prato de comida para compartilhar com todes e também levar suas próprias bebidas ou comprar diretamente do motel.`,
  },
  {
    heading: "Próximos passos",
    body: `Se você sente que tem aderência com nossa proposta, saiba que, para ir à Positiv, é necessário:

1. Preencher este formulário, inclusive responder às questões sobre nossas regras (que serão apresentadas a seguir)
2. Se for selecionade, fazer uma pequena "entrevista" com um dos organizadores - Angelo ou Ju
3. Se passar na entrevista, participar de um grupo de WhatsApp com todes es participantes da festa, que fica aberto durante uma semana antes da festa, para as pessoas criarem conexões e irem se conhecendo.

**Em qualquer um dos passos do processo, sua participação pode ser cancelada, caso sua conduta não corresponda com o que nós pregamos.**`,
  },
  {
    heading: "Entradas sociais",
    body: `Temos políticas de **entradas sociais** para pessoas trans, negras, indígenas e em vulnerabilidade social. Se você faz parte de um desses grupos e gostaria de participar da festa, candidate-se e avise na hora da entrevista.`,
  },
  {
    heading: "Política de reembolso",
    body: `Nossa política é simples: ao confirmarmos o número de participantes, pedimos o pagamento em até 15 dias antes do evento. Após o pagamento ser efetuado, seu lugar está garantido e você será adicionado no grupo do WhatsApp do evento.

Se você precisar cancelar sua presença, temos regras específicas para reembolso:

- Mais que 5 dias antes do evento:
  - Devolvemos 50% do valor.
  - Os 50% retidos servem como taxa de administração e sinal.
- 5 dias antes do evento:
  - Não há reembolso.

Lembrando que calculamos a data a partir do pedido de reembolso — não esqueça de nos contatar. Qualquer valor extra doado para vagas sociais não será reembolsado, afinal, ele pode já ter sido usado.`,
  },
]

export const agreeToTermsCopy = {
  title: "Bem vinde à Positiv!",
  alert: {
    title: "Tem que ler tudo!",
    body: "Se não puder gastar uns minutos lendo isso, já não é uma pessoa que passaria em nossa entrevista",
  },
  sections: termsSections,
  labels: {
    agree: "Li tudo e estou de acordo!",
    commonEmails: "Aceito receber e-mails gerais do sistema",
    mktEmails: "Aceito receber e-mails sobre a Positiv",
  },
  descriptions: {
    commonEmails:
      "Vamos enviar mensagens sobre o processo de candidatura e, se você quiser, lembrete de datas importantes de eventos futuros (mas só se você clicar no botãozinho).",
    mktEmails:
      "Vamos enviar mensagens sobre outros eventos e parcerias, e também atualizações da Positiv que podem ir além das festas tradicionais .",
  },
  buttonLabel: "Continuar",
  newsletterWarning:
    "Suas escolhas foram salvas, mas sua assinatura da newsletter não foi concluída. Por favor, entre em contato: partypositiv@gmail.com",
  successToast: "Escolhas salvas com sucesso",
  validation: {
    agree: "Você só pode continuar se estiver de acordo.",
    commonEmails:
      "Nosso sistema só funciona se você aceitar receber e-mails gerais.",
  },
} as const

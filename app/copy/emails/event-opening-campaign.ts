export const eventOpeningCampaignCopy = {
  subject: (eventTitle: string) => `Candidaturas abertas: ${eventTitle}!`,
  headingEmoji: "🎉",
  heading: "Candidaturas Abertas",
  intro: (eventName: string) =>
    `As candidaturas para o evento <strong>${eventName}</strong> acabaram de abrir!`,
  urgency: "Corra já e garanta a sua vaga!",
  cta: "Inscreva-se agora!",
  details: {
    event: "Evento",
    location: "Local",
    date: "Data do evento",
    startTime: "Horário de início",
    applicationsOpen: "Candidaturas abrem em",
    dateAtTime: (date: string | undefined, time: string | undefined) =>
      `${date} às ${time}`,
  },
  important: {
    heading: "Informações importantes",
    notes: {
      previousEditions:
        "Ter participado de edições anteriores <strong>não garante</strong> a sua participação em outras festas;",
      companions:
        "Se você quer ir acompanhade, <strong>todas as pessoas</strong> precisam se inscrever e passar pela entrevista;",
      notSelected:
        "Inscrever-se no formulário <strong>não significa</strong> que você será selecionade para participar do evento;",
      socialTickets:
        "Temos políticas de <strong>entradas sociais</strong> para pessoas trans, negras, indígenas e em vulnerabilidade social. Se você é de um desses grupos e gostaria de participar da festa, fale com Ju ou Angelo pelo nosso WhatsApp.",
    },
  },
} as const

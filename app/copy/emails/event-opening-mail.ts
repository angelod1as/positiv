export const eventOpeningMailCopy = {
  documentTitle: "Novo evento aberto - Positiv",
  logoAlt: "Positiv",
  heading: "Novo evento disponível! 🎉",
  intro: (eventName: string) =>
    `As candidaturas para <strong>${eventName}</strong> acabam de abrir!`,
  urgency: "Corra e garanta sua vaga enquanto há tempo! ⚡",
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
  footer: {
    reason: "Você recebeu este e-mail pois está inscrite na newsletter da",
    brand: "Positiv",
    unsubscribe: "Cancelar inscrição",
    settings: "Configurações",
  },
} as const

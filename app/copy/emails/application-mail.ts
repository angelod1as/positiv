export const applicationMailCopy = {
  documentTitle: "Candidatura em evento - Positiv",
  logoAlt: "Positiv",
  heading: "Sua candidatura foi recebida",
  intro: (displayName: string, eventName: string) =>
    `${displayName}, sua candidatura foi enviada com sucesso para o evento <strong>${eventName}</strong>!`,
  details: {
    event: "Evento",
    location: "Local",
    date: "Data",
    startTime: "Horário de início",
  },
  important: {
    heading: "Importante!",
    lead: "Não se esqueça:",
    notes: {
      handcrafted:
        "Nosso processo é artesanal, manual e cuidadoso. Tenha paciência com nosso cronograma e empatia com as pessoas que fazem isso tudo acontecer. Contamos com você!",
      previousEditions:
        "Ter participado de edições anteriores <strong>não garante</strong> a sua participação em outras festas;",
      companions:
        "Se você quer ir acompanhade, <strong>todas as pessoas</strong> precisam se inscrever e passar pela entrevista;",
      notSelected:
        "Inscrever-se no formulário <strong>não significa</strong> que você será selecionade para participar do evento;",
      socialTickets:
        "Temos políticas de <strong>entradas sociais</strong> para pessoas trans, negras, indígenas e em vulnerabilidade social. Se você faz parte de um desses grupos e gostaria de participar da festa, fale com Ju ou Angelo pelo nosso WhatsApp.",
    },
  },
  footer: {
    reason: "Você recebeu este e-mail pois se cadastrou no site da",
    brand: "Positiv",
    settings: "Configurações",
  },
} as const

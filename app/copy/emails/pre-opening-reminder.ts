export const preOpeningReminderCopy = {
  subject: (daysBefore: number, eventTitle: string) =>
    `⏰ Atenção: Candidaturas abrem em ${daysBefore} dias - ${eventTitle}`,
  headingEmoji: "⏰",
  heading: (daysBefore: number) =>
    `Atenção: Candidaturas abrem em ${daysBefore} dias!`,
  intro: (daysBefore: number, eventName: string) =>
    `Daqui a ${daysBefore} dias as candidaturas para <strong>${eventName}</strong> abrem!`,
  calendarReminder: "Coloca aí no calendário e CORRE quando abrir!",
  cta: "Acessar Dashboard",
  details: {
    event: "Evento",
    location: "Local",
    date: "Data do evento",
    startTime: "Horário de início",
    applicationsOpen: "📅 Candidaturas abrem em",
    dateAtTime: (date: string | undefined, time: string | undefined) =>
      `${date} às ${time}`,
  },
  important: {
    heading: "🚨 Informações importantes",
    notes: {
      automaticClose:
        "O sistema fecha as candidaturas AUTOMATICAMENTE quando bater 90 candidates",
      selection: "Desses 90, selecionaremos 60 pessoas para o evento",
      previousEditions:
        "Ter participado de edições anteriores <strong>não garante</strong> a sua participação em outras festas",
      companions:
        "Se você quer ir acompanhade, <strong>todas as pessoas</strong> precisam se inscrever e passar pela entrevista",
    },
  },
} as const

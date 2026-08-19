export const registrationLimitAdminCopy = {
  documentTitle: "Evento atingiu limite de candidaturas - Positiv",
  logoAlt: "Positiv",
  heading: "📊 Evento atingiu limite de candidaturas",
  intro: (eventName: string, participantCount: number) =>
    `O evento <strong>${eventName}</strong> atingiu o limite de <strong>${participantCount} participantes</strong> e as candidaturas foram fechadas automaticamente.`,
  details: {
    event: "Evento",
    limitReachedAt: "Data/hora do limite",
    participantTotal: "Total de participantes",
    status: "Status",
    dateAtTime: (date: string | undefined, time: string | undefined) =>
      `${date} às ${time}`,
  },
  cta: "Ver Participantes",
  automaticNotice:
    "Esta é uma notificação automática enviada pelo sistema quando um evento atinge o limite de 90 candidaturas.",
  footer: {
    reason: "Notificação enviada para administradores da",
    brand: "Positiv",
    adminPanel: "Painel Admin",
  },
} as const

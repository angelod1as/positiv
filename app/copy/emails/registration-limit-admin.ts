// The baseline copy of the registration-limit email to admins, the single
// source the Studio seed, the production migration and the code fallback all
// read. Kept free of any ~-aliased import so the Studio package can import it
// across the boundary. Plain strings and Portable Text (bold and italic only);
// {{variables}} are filled by the renderer at send time.
export const registrationLimitAdminMailContent = {
  subject: "📊 Evento atingiu limite de candidaturas - {{evento}}",
  heading: "📊 Evento atingiu limite de candidaturas",
  body: [
    {
      _type: "block",
      _key: "intro",
      style: "normal",
      markDefs: [],
      children: [
        { _type: "span", _key: "intro-0", text: "O evento ", marks: [] },
        { _type: "span", _key: "intro-1", text: "{{evento}}", marks: ["strong"] },
        { _type: "span", _key: "intro-2", text: " atingiu o limite de ", marks: [] },
        {
          _type: "span",
          _key: "intro-3",
          text: "{{participantes}} participantes",
          marks: ["strong"],
        },
        {
          _type: "span",
          _key: "intro-4",
          text: " e as candidaturas foram fechadas automaticamente.",
          marks: [],
        },
      ],
    },
  ],
  cta: "Ver Participantes",
  closing: [
    {
      _type: "block",
      _key: "automatic-notice",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "automatic-notice-0",
          text: "Esta é uma notificação automática enviada pelo sistema quando um evento atinge o limite de 90 candidaturas.",
          marks: [],
        },
      ],
    },
  ],
} as const

export const registrationLimitAdminCopy = {
  documentTitle: "Evento atingiu limite de candidaturas - Positiv",
  logoAlt: "Positiv",
  details: {
    event: "Evento",
    limitReachedAt: "Data/hora do limite",
    participantTotal: "Total de participantes",
    status: "Status",
    dateAtTime: (date: string | undefined, time: string | undefined) =>
      `${date} às ${time}`,
  },
  footer: {
    reason: "Notificação enviada para administradores da",
    brand: "Positiv",
    adminPanel: "Painel Admin",
  },
} as const

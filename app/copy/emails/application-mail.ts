// The baseline copy of the application email, the single source the Studio
// seed, the production migration and the code fallback all read. Kept free of
// any ~-aliased import so the Studio package can import it across the boundary.
// Plain strings and Portable Text (bold and italic only); {{variables}} are
// filled by the renderer at send time.
export const applicationMailContent = {
  subject: "Recebemos sua candidatura ao evento {{evento}}",
  heading: "Sua candidatura foi recebida",
  body: [
    {
      _type: "block",
      _key: "intro",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "intro-0",
          text: "{{nome}}, sua candidatura foi enviada com sucesso para o evento ",
          marks: [],
        },
        { _type: "span", _key: "intro-1", text: "{{evento}}", marks: ["strong"] },
        { _type: "span", _key: "intro-2", text: "!", marks: [] },
      ],
    },
  ],
  importantHeading: "Importante!",
  importantLead: "Não se esqueça:",
  notes: [
    {
      _type: "block",
      _key: "handcrafted",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "handcrafted-0",
          text: "Nosso processo é artesanal, manual e cuidadoso. Tenha paciência com nosso cronograma e empatia com as pessoas que fazem isso tudo acontecer. Contamos com você!",
          marks: [],
        },
      ],
    },
    {
      _type: "block",
      _key: "previous-editions",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "previous-editions-0",
          text: "Ter participado de edições anteriores ",
          marks: [],
        },
        {
          _type: "span",
          _key: "previous-editions-1",
          text: "não garante",
          marks: ["strong"],
        },
        {
          _type: "span",
          _key: "previous-editions-2",
          text: " a sua participação em outras festas;",
          marks: [],
        },
      ],
    },
    {
      _type: "block",
      _key: "companions",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "companions-0",
          text: "Se você quer ir acompanhade, ",
          marks: [],
        },
        {
          _type: "span",
          _key: "companions-1",
          text: "todas as pessoas",
          marks: ["strong"],
        },
        {
          _type: "span",
          _key: "companions-2",
          text: " precisam se candidatar e passar pela entrevista;",
          marks: [],
        },
      ],
    },
    {
      _type: "block",
      _key: "not-selected",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "not-selected-0",
          text: "Candidatar-se pelo formulário ",
          marks: [],
        },
        {
          _type: "span",
          _key: "not-selected-1",
          text: "não significa",
          marks: ["strong"],
        },
        {
          _type: "span",
          _key: "not-selected-2",
          text: " que você será selecionade para participar do evento;",
          marks: [],
        },
      ],
    },
    {
      _type: "block",
      _key: "social-tickets",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "social-tickets-0",
          text: "Temos políticas de ",
          marks: [],
        },
        {
          _type: "span",
          _key: "social-tickets-1",
          text: "entradas sociais",
          marks: ["strong"],
        },
        {
          _type: "span",
          _key: "social-tickets-2",
          text: " para pessoas trans, negras, indígenas e em vulnerabilidade social. Se você faz parte de um desses grupos e gostaria de participar da festa, fale com Ju ou Angelo pelo nosso WhatsApp.",
          marks: [],
        },
      ],
    },
  ],
} as const

export const applicationMailCopy = {
  documentTitle: "Candidatura em evento - Positiv",
  logoAlt: "Positiv",
  details: {
    event: "Evento",
    location: "Local",
    date: "Data",
    startTime: "Horário de início",
  },
  footer: {
    reason: "Você recebeu este e-mail pois se cadastrou no site da",
    brand: "Positiv",
    settings: "Configurações",
  },
} as const

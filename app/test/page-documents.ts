export const paragraph = (text: string) => [
  {
    _type: "block",
    _key: "b1",
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: "s1", text, marks: [] }],
  },
]

export const image = {
  alt: "Duas pessoas sorrindo",
  asset: { _ref: "image-abc-800x600-jpg", _type: "reference" },
  crop: null,
  hotspot: null,
}

export const sections = {
  nextEvents: {
    _type: "nextEvents",
    _key: "next-events",
    title: "Próximos eventos",
    subtitle: "Confira nossos próximos encontros.",
    count: 3,
  },
  about: {
    _type: "about",
    _key: "about",
    title: "Como assim?",
    cards: ["para quem?", "como funciona?", "e depois?"].map(
      (title, index) => ({
        _key: `card-${index}`,
        title,
        body: paragraph("Texto do cartão."),
      }),
    ),
  },
  testimonials: {
    _type: "testimonials",
    _key: "testimonials",
    title: "Quem vai, nunca esquece",
    subtitle: "Experiências reais.",
    quotes: [{ _key: "quote", author: "A., 32", quote: "Libertador." }],
  },
  ctaBanner: {
    _type: "ctaBanner",
    _key: "cta-banner",
    title: "Não perca nossos próximos eventos",
    body: paragraph("Faça login para se inscrever."),
  },
  founders: {
    _type: "founders",
    _key: "founders",
    title: "Quem faz a Positiv",
    videoUrl: "https://www.youtube.com/watch?v=abc",
    videoTitle: "Vídeo de apresentação",
    people: [
      {
        _id: "person-1",
        name: "Angelo",
        pronouns: "ele/dele",
        instagram: "angelo",
        photo: image,
        bio: paragraph("Uma bio."),
      },
    ],
  },
  feedback: {
    _type: "feedback",
    _key: "feedback",
    title: "Feedback",
    body: paragraph("Conte para a gente."),
    ctaLabel: "Deixar feedback",
  },
  richTextSection: {
    _type: "richTextSection",
    _key: "rich-text",
    title: "Código de conduta",
    body: [
      { ...paragraph("Consentimento")[0], _key: "h", style: "h2" },
      {
        ...paragraph("Não é não.")[0],
        _key: "l",
        listItem: "bullet",
        level: 1,
      },
    ],
  },
  imageSection: {
    _type: "imageSection",
    _key: "image",
    image: { ...image, dimensions: { width: 800, height: 600 } },
    caption: "Uma legenda",
  },
}

export const headers = {
  homepageHero: {
    _type: "homepageHero",
    _key: "header",
    title: "evento de gente pelada",
    subtitle: paragraph("para amantes de saliências não-mono"),
  },
  pageHero: {
    _type: "pageHero",
    _key: "header",
    title: "Quem faz a Positiv",
    subtitle: paragraph("Uma página aninhada com Destaque."),
  },
  pageTitle: {
    _type: "pageTitle",
    _key: "header",
    title: "Sobre a Positiv",
    intro: "Uma página com só um título.",
  },
}

export const seo = {
  title: null,
  description:
    "Quem somos e por que fazemos eventos: conteúdo de exemplo para os testes.",
  image: null,
  noIndex: null,
}

export const page = (overrides: Record<string, unknown> = {}) => ({
  _id: "page-sobre",
  _updatedAt: "2026-09-30T12:00:00Z",
  title: "Sobre",
  address: "/sobre",
  header: [headers.pageTitle],
  sections: [sections.feedback],
  seo,
  ...overrides,
})

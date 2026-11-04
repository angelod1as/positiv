import { paragraphs } from "./portable-text"

export const sections = {
  nextEvents: {
    _type: "nextEvents",
    _key: "next-events",
    title: "Próximos Eventos",
    subtitle: "Confira nossos próximos encontros.",
    count: 3,
  },
  about: {
    _type: "about",
    _key: "about",
    title: "Como assim?",
    cards: ["a", "b", "c"].map((key) => ({
      _type: "aboutCard",
      _key: key,
      title: "para quem?",
      body: paragraphs("Para pessoas queer."),
    })),
  },
  testimonials: {
    _type: "testimonials",
    _key: "testimonials",
    title: "Quem vai, nunca esquece",
    subtitle: "Experiências reais.",
    quotes: [
      {
        _type: "testimonial",
        _key: "q",
        author: "A., 32",
        quote: "Libertador.",
      },
    ],
  },
  ctaBanner: {
    _type: "ctaBanner",
    _key: "cta-banner",
    title: "Não perca nossos próximos eventos",
    body: paragraphs("Faça login agora."),
  },
  founders: {
    _type: "founders",
    _key: "founders",
    title: "Quem faz a Positiv?",
    people: [{ _type: "reference", _key: "j", _ref: "person-julia" }],
    videoUrl: "https://www.youtube.com/watch?v=WIveBynr7Yc",
    videoTitle: "Vídeo de apresentação",
  },
  feedback: {
    _type: "feedback",
    _key: "feedback",
    title: "Nos deixe um feedback",
    body: paragraphs("Estamos sempre buscando melhorias."),
    ctaLabel: "Deixar feedback",
  },
  richTextSection: {
    _type: "richTextSection",
    _key: "rich-text",
    title: "Código de conduta",
    body: [
      {
        _type: "block",
        _key: "h",
        style: "h2",
        markDefs: [],
        children: [
          { _type: "span", _key: "hs", text: "Consentimento", marks: [] },
        ],
      },
      {
        _type: "block",
        _key: "li",
        style: "normal",
        listItem: "bullet",
        level: 1,
        markDefs: [],
        children: [
          { _type: "span", _key: "lis", text: "Pergunte antes.", marks: [] },
        ],
      },
    ],
  },
  imageSection: {
    _type: "imageSection",
    _key: "image",
    image: {
      _type: "image",
      asset: { _type: "reference", _ref: "image-abc-400x400-png" },
      alt: "Pessoas num piquenique",
    },
    caption: "O primeiro evento da Positiv",
  },
  statsSection: {
    _type: "statsSection",
    _key: "stats",
    title: "O ano em números",
    cards: [
      {
        _type: "statNumber",
        _key: "parties",
        unit: "none",
        value: 14,
        caption: "festas",
      },
      {
        _type: "statRange",
        _key: "age",
        unit: "none",
        min: 19,
        average: 31.4,
        max: 64,
        caption: "anos de idade",
      },
      {
        _type: "statComparison",
        _key: "newcomers",
        unit: "percent",
        before: 22,
        beforeLabel: "2025",
        after: 31,
        afterLabel: "2026",
        caption: "de novates",
      },
    ],
  },
}

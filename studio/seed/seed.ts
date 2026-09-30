import { HOMEPAGE_PAGE_ID } from "../schemas/documents/page"

type Item = { _type: string; [field: string]: unknown }

type SeedDocument = {
  _id: string
  _type: string
  address?: string
  header?: Item[]
  sections?: Item[]
  [field: string]: unknown
}

type SeedStore = {
  uploadPhoto(): Promise<string>
  replace(documents: SeedDocument[]): Promise<void>
}

function paragraphs(...texts: string[]) {
  return texts.map((text, index) => ({
    _type: "block",
    _key: `p${index}`,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `s${index}`, text, marks: [] }],
  }))
}

function person(id: string, name: string, photoAssetId: string) {
  return {
    _id: id,
    _type: "person",
    name,
    pronouns: "elu/delu",
    instagram: "positiv.seed",
    photo: {
      _type: "image",
      asset: { _type: "reference", _ref: photoAssetId },
      alt: `Foto de ${name}`,
    },
    bio: paragraphs(
      `${name} é uma pessoa fictícia do conteúdo de desenvolvimento.`,
    ),
  }
}

function seo(description: string) {
  return { _type: "seo", description, noIndex: false }
}

export function seedDocuments(photoAssetId: string): SeedDocument[] {
  const people = [
    person("seed-person-ana", "Ana Exemplo", photoAssetId),
    person("seed-person-bia", "Bia Exemplo", photoAssetId),
  ]

  return [
    ...people,
    {
      _id: HOMEPAGE_PAGE_ID,
      _type: "page",
      title: "Início",
      address: "/",
      header: [
        {
          _type: "homepageHero",
          _key: "header",
          title: "evento de gente pelada",
          subtitle: paragraphs("para amantes de saliências não-mono"),
        },
      ],
      sections: [
        {
          _type: "nextEvents",
          _key: "next-events",
          title: "Próximos eventos",
          subtitle: "Confira nossos próximos encontros.",
          count: 3,
        },
        {
          _type: "about",
          _key: "about",
          title: "Como assim?",
          cards: ["para quem?", "como funciona?", "e depois?"].map(
            (title, index) => ({
              _type: "aboutCard",
              _key: `card-${index}`,
              title,
              body: paragraphs(
                "Texto de exemplo para o ambiente de desenvolvimento.",
              ),
            }),
          ),
        },
        {
          _type: "testimonials",
          _key: "testimonials",
          title: "Quem vai, nunca esquece",
          subtitle: "Experiências reais.",
          quotes: [
            {
              _type: "testimonial",
              _key: "quote",
              author: "A., 32",
              quote: "Libertador.",
            },
          ],
        },
        {
          _type: "ctaBanner",
          _key: "cta-banner",
          title: "Não perca nossos próximos eventos",
          body: paragraphs("Faça login para se inscrever."),
        },
        {
          _type: "founders",
          _key: "founders",
          title: "Quem faz a Positiv?",
          people: people.map(({ _id }) => ({
            _type: "reference",
            _key: _id,
            _ref: _id,
          })),
          videoUrl: "https://www.youtube.com/watch?v=WIveBynr7Yc",
          videoTitle: "Vídeo de apresentação",
        },
        {
          _type: "feedback",
          _key: "feedback",
          title: "Nos deixe um feedback",
          body: paragraphs("Estamos sempre buscando melhorias."),
          ctaLabel: "Deixar feedback",
        },
      ],
      seo: seo(
        "Eventos naturistas para pessoas queer: conteúdo de exemplo do ambiente de desenvolvimento.",
      ),
    },
    {
      _id: "seed-page-sobre",
      _type: "page",
      title: "Sobre",
      address: "/sobre",
      header: [
        {
          _type: "pageTitle",
          _key: "header",
          title: "Sobre a Positiv",
          intro:
            "Uma página com só um título, para o ambiente de desenvolvimento.",
        },
      ],
      sections: [
        {
          _type: "feedback",
          _key: "feedback",
          title: "Nos deixe um feedback",
          body: paragraphs("Estamos sempre buscando melhorias."),
          ctaLabel: "Deixar feedback",
        },
      ],
      seo: seo(
        "Quem somos e por que fazemos eventos: conteúdo de exemplo do ambiente de desenvolvimento.",
      ),
    },
    {
      _id: "seed-page-sobre-equipe",
      _type: "page",
      title: "Equipe",
      address: "/sobre/equipe",
      header: [
        {
          _type: "pageHero",
          _key: "header",
          title: "Quem faz a Positiv",
          subtitle: paragraphs("Uma página aninhada com Destaque."),
        },
      ],
      sections: [
        {
          _type: "founders",
          _key: "founders",
          title: "Quem faz a Positiv?",
          people: people.map(({ _id }) => ({
            _type: "reference",
            _key: _id,
            _ref: _id,
          })),
          videoUrl: "https://www.youtube.com/watch?v=WIveBynr7Yc",
          videoTitle: "Vídeo de apresentação",
        },
      ],
      seo: seo(
        "As pessoas por trás dos eventos: conteúdo de exemplo do ambiente de desenvolvimento.",
      ),
    },
  ]
}

export async function seed(dataset: string | undefined, store: SeedStore) {
  if (dataset !== "development") {
    throw new Error(
      `The seed only writes to the development dataset, not to "${dataset}".`,
    )
  }

  await store.replace(seedDocuments(await store.uploadPhoto()))
}

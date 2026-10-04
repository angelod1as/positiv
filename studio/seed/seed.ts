import { HOMEPAGE_PAGE_ID } from "../schemas/documents/page"
import { SITE_SETTINGS_ID } from "../singletons"

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

function linkedParagraph(
  key: string,
  before: string,
  linkText: string,
  href: string,
  after: string,
) {
  return {
    _type: "block",
    _key: key,
    style: "normal",
    markDefs: [{ _type: "link", _key: `${key}-link`, href }],
    children: [
      { _type: "span", _key: `${key}-before`, text: before, marks: [] },
      {
        _type: "span",
        _key: `${key}-text`,
        text: linkText,
        marks: [`${key}-link`],
      },
      { _type: "span", _key: `${key}-after`, text: after, marks: [] },
    ],
  }
}

function block(key: string, text: string, fields: object = {}) {
  return {
    _type: "block",
    _key: key,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `${key}-span`, text, marks: [] }],
    ...fields,
  }
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

function linkToPage(key: string, label: string, pageId: string) {
  return {
    _type: "siteLink",
    _key: key,
    label,
    page: { _type: "reference", _ref: pageId },
  }
}

function linkToUrl(key: string, label: string, url: string) {
  return { _type: "siteLink", _key: key, label, url }
}

function seo(description: string) {
  return { _type: "seo", description, noIndex: false }
}

export function seedDocuments(photoAssetId: string): SeedDocument[] {
  const people = [
    person("seed-person-ana", "Ana Exemplo", photoAssetId),
    person("seed-person-bia", "Bia Exemplo", photoAssetId),
  ]

  const founders = {
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
  }

  const feedback = {
    _type: "feedback",
    _key: "feedback",
    title: "Nos deixe um feedback",
    body: paragraphs("Estamos sempre buscando melhorias."),
    ctaLabel: "Deixar feedback",
  }

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
        founders,
        feedback,
        {
          _type: "richTextSection",
          _key: "rich-text",
          title: "Código de conduta",
          body: [
            block("heading", "Consentimento", { style: "h2" }),
            {
              _type: "block",
              _key: "paragraph",
              style: "normal",
              markDefs: [{ _type: "link", _key: "events", href: "/eventos" }],
              children: [
                {
                  _type: "span",
                  _key: "paragraph-span",
                  text: "Texto de exemplo com ",
                  marks: [],
                },
                {
                  _type: "span",
                  _key: "paragraph-bold",
                  text: "negrito",
                  marks: ["strong"],
                },
                {
                  _type: "span",
                  _key: "paragraph-link",
                  text: " e um link para os eventos.",
                  marks: ["events"],
                },
              ],
            },
            block("subheading", "Antes do evento", { style: "h3" }),
            ...["Pergunte antes de tocar.", "Não é não."].map((text, index) =>
              block(`bullet-${index}`, text, { listItem: "bullet", level: 1 }),
            ),
            ...["Chegue no horário.", "Respeite os espaços."].map(
              (text, index) =>
                block(`number-${index}`, text, {
                  listItem: "number",
                  level: 1,
                }),
            ),
            block("quote", "Uma citação de exemplo.", { style: "blockquote" }),
          ],
        },
        {
          _type: "imageSection",
          _key: "image",
          image: {
            _type: "image",
            asset: { _type: "reference", _ref: photoAssetId },
            alt: "Imagem de exemplo do ambiente de desenvolvimento",
          },
          caption: "Uma legenda de exemplo",
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
      sections: [feedback],
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
      sections: [founders],
      seo: seo(
        "As pessoas por trás dos eventos: conteúdo de exemplo do ambiente de desenvolvimento.",
      ),
    },
    {
      _id: SITE_SETTINGS_ID,
      _type: "siteSettings",
      navigation: [
        linkToPage("sobre", "Sobre", "seed-page-sobre"),
        linkToPage("equipe", "Equipe", "seed-page-sobre-equipe"),
        linkToUrl("eventos", "Eventos", "/eventos"),
        linkToUrl(
          "instagram",
          "Instagram",
          "https://instagram.com/positivparty",
        ),
      ],
      footer: {
        columns: [
          {
            _type: "footerColumn",
            _key: "positiv",
            title: "A Positiv",
            links: [
              linkToPage("inicio", "Início", HOMEPAGE_PAGE_ID),
              linkToPage("sobre", "Sobre", "seed-page-sobre"),
              linkToPage("equipe", "Equipe", "seed-page-sobre-equipe"),
            ],
          },
          {
            _type: "footerColumn",
            _key: "plataforma",
            title: "Plataforma",
            links: [linkToUrl("eventos", "Eventos", "/eventos")],
          },
        ],
        social: [
          {
            _type: "socialLink",
            _key: "instagram",
            network: "instagram",
            url: "https://instagram.com/positivparty",
          },
        ],
        text: [
          ...paragraphs("© 2025 Positiv. Todos os direitos reservados."),
          linkedParagraph(
            "developed-by",
            "Este website está em constante desenvolvimento por ",
            "Angelo Dias",
            "https://www.angelodias.com.br",
            ".",
          ),
          linkedParagraph(
            "bug-report",
            "Encontrou um bug? ",
            "Clique aqui e nos avise",
            "https://forms.gle/ys6W6W54YTcoBHrJA",
            ".",
          ),
        ],
      },
      notice: paragraphs(
        "Este é um aviso de exemplo do ambiente de desenvolvimento.",
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

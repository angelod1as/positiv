import { applicationMailContent } from "../../app/copy/emails/application-mail"
import { paymentConfirmedMailContent } from "../../app/copy/emails/payment-confirmed"
import { paymentLinkMailContent } from "../../app/copy/emails/payment-link"
import { paymentRefundMailContent } from "../../app/copy/emails/payment-refund"
import { codeOfConductToPage } from "./code-of-conduct-page"
import { HOMEPAGE_PAGE_ID } from "../schemas/documents/page"
import {
  EMAIL_TEMPLATES_ID,
  LIKERT_SCALE_ID,
  PAYMENT_MESSAGES_ID,
  RULES_ID,
  SITE_SETTINGS_ID,
} from "../singletons"

export const SEED_WHATSAPP_PAYMENT_MESSAGE = [
  "Oi, {{nome}}! Aqui está o link para o pagamento da {{evento}}:",
  "",
  "{{link}}",
  "",
  "Formas de pagamento:",
  "{{formas}}",
  "",
  "O link vale até {{data}}.",
].join("\n")

export const CALLOUTS_PAGE_ID = "seed-page-exemplo-callouts"
export const CALLOUTS_PAGE_ADDRESS = "/exemplo-callouts"

export const E2E_TEST_PAGE_ID = "page-e2e-test"
export const E2E_TEST_PAGE_ADDRESS = "/pagina-de-teste"
export const E2E_TEST_SENTINEL =
  "Se você chegou aqui, parabéns, encontrou nossa página de teste."

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
      ...(before
        ? [{ _type: "span", _key: `${key}-before`, text: before, marks: [] }]
        : []),
      {
        _type: "span",
        _key: `${key}-text`,
        text: linkText,
        marks: [`${key}-link`],
      },
      ...(after
        ? [{ _type: "span", _key: `${key}-after`, text: after, marks: [] }]
        : []),
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

// Placeholder content: the real scale is still being written, and lands in
// the Studio once it is final.
const LIKERT_STATEMENT_COUNT = 7

function likertScale() {
  return {
    _id: LIKERT_SCALE_ID,
    _type: "likertScale",
    statements: Array.from({ length: LIKERT_STATEMENT_COUNT }, (_, index) => {
      const number = index + 1
      const key = `exemplo-${String(number).padStart(2, "0")}`
      return {
        _type: "likertStatement",
        _key: key,
        key,
        text: `[Exemplo] Afirmação ${number}.`,
      }
    }),
  }
}

// Placeholder content: the real rules are written in the Studio.
function rules() {
  const rule = (key: string, title: string, highlight?: string) => ({
    _type: "rule",
    _key: key,
    title: `[Exemplo] ${title}`,
    body: paragraphs("Texto de exemplo do ambiente de desenvolvimento."),
    ...(highlight && {
      highlight: { title: highlight, body: paragraphs("Destaque de exemplo.") },
    }),
  })

  return {
    _id: RULES_ID,
    _type: "rules",
    generalRulesTitle: "Regras Gerais",
    generalRulesSubtitle: "[Exemplo] Para todo mundo",
    agreementsTitle: "Acordos",
    privateRulesTitle: "Regras Privadas",
    generalRules: [
      rule("consentimento", "Regra geral 1", "Um destaque de exemplo"),
      rule("privacidade", "Regra geral 2"),
    ],
    agreements: [rule("pontualidade", "Acordo 1"), rule("comida", "Acordo 2")],
    privateRules: [rule("privada", "Regra privada 1")],
  }
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

  const statsSection = {
    _type: "statsSection",
    _key: "stats",
    title: "Números de exemplo",
    cards: [
      {
        _type: "statNumber",
        _key: "parties",
        unit: "none",
        value: 14,
        caption: "festas",
      },
      {
        _type: "statNumber",
        _key: "surubagres",
        unit: "none",
        value: 0,
        caption: "surubagres morreram",
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
        caption: "de novates em cada festa",
      },
      {
        _type: "statComparison",
        _key: "infrastructure",
        unit: "brl",
        before: 8000,
        beforeLabel: "2025",
        after: 12400,
        afterLabel: "2026",
        caption: "investidos em infraestrutura",
      },
    ],
  }

  const chartRow = (
    _key: string,
    label: string,
    values: number[],
    highlight = false,
  ) => ({ _type: "chartRow", _key, label, values, highlight })

  const systemComponent = {
    _type: "systemComponent",
    _key: "system-component",
    component: "analyticsOptOut",
  }

  const rulesSection = {
    _type: "rulesSection",
    _key: "rules",
    part: "generalRules",
  }

  const callout = (
    _key: string,
    color: string,
    fields: { emoji?: string; title?: string; body?: object[] } = {},
  ) => ({
    _type: "callout",
    _key,
    color,
    body: paragraphs("Um texto curto de exemplo, com o que importa saber."),
    ...fields,
  })

  const calloutSection = callout("callout", "purple", {
    emoji: "📣",
    title: "Inscrições abertas",
    body: [
      linkedParagraph(
        "callout-link",
        "Garanta sua vaga até sexta. ",
        "Veja os eventos",
        "/eventos",
        ".",
      ),
    ],
  })

  const sideBySide = (
    _key: string,
    title: string | undefined,
    items: ReturnType<typeof callout>[],
  ) => ({ _type: "sideBySide", _key, title, items })

  const sideBySideSection = sideBySide("side-by-side", "Antes de ir", [
    callout("ticket", "blue", { emoji: "🎟️", title: "Ingresso" }),
    callout("early", "green", { emoji: "⏰", title: "Chegue cedo" }),
  ])

  const chartSections = [
    {
      _type: "chartSection",
      _key: "chart-bar",
      title: "Festas por ano",
      summary: "As festas mais que dobraram desde 2023.",
      chartType: "bar",
      unit: "none",
      series: ["Festas"],
      rows: [
        chartRow("y2023", "2023", [6]),
        chartRow("y2024", "2024", [9]),
        chartRow("y2025", "2025", [12]),
        chartRow("y2026", "2026", [14], true),
      ],
    },
    {
      _type: "chartSection",
      _key: "chart-horizontal-bar",
      title: "Sexualidade",
      summary:
        "Cada pessoa pode marcar mais de uma resposta, então a soma passa de 100%.",
      chartType: "horizontalBar",
      unit: "percent",
      series: ["Participantes"],
      rows: [
        chartRow("bi", "Bissexual", [38]),
        chartRow("gay", "Gay", [34]),
        chartRow("pan", "Pansexual", [17]),
        chartRow("lesbian", "Lésbica", [9]),
        chartRow("hetero", "Heterossexual", [6]),
      ],
    },
    {
      _type: "chartSection",
      _key: "chart-line",
      title: "Novates e veteranes",
      summary: "Em 2026, pela primeira vez, vieram mais veteranes do que novates.",
      chartType: "line",
      unit: "none",
      series: ["Novates", "Veteranes"],
      rows: [
        chartRow("y2023", "2023", [40, 10]),
        chartRow("y2024", "2024", [55, 30]),
        chartRow("y2025", "2025", [60, 52]),
        chartRow("y2026", "2026", [70, 80], true),
      ],
    },
    {
      _type: "chartSection",
      _key: "chart-proportion",
      title: "Para onde foi o dinheiro",
      summary: "Mais da metade foi para o aluguel do espaço.",
      chartType: "proportion",
      unit: "brl",
      series: ["Gastos"],
      rows: [
        chartRow("venue", "Espaço", [12400], true),
        chartRow("staff", "Equipe", [6000]),
        chartRow("infrastructure", "Infraestrutura", [3200]),
        chartRow("promotion", "Divulgação", [800]),
        chartRow("tips", "Gorjetas", [400]),
      ],
    },
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
        statsSection,
        ...chartSections,
        calloutSection,
        sideBySideSection,
        systemComponent,
        rulesSection,
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
    codeOfConductToPage(),
    {
      _id: CALLOUTS_PAGE_ID,
      _type: "page",
      title: "Exemplo de callouts",
      address: CALLOUTS_PAGE_ADDRESS,
      header: [
        {
          _type: "pageTitle",
          _key: "header",
          title: "Callouts",
          intro:
            "Todas as cores, com e sem título ou emoji, e Lado-a-lado com 2, 3 e 4 blocos.",
        },
      ],
      sections: [
        callout("alone-purple", "purple", {
          emoji: "💜",
          title: "Um callout sozinho",
          body: [
            ...paragraphs("Ocupa uma linha, na largura do texto."),
            block("list-a", "Aceita listas", {
              listItem: "bullet",
              level: 1,
            }),
            block("list-b", "Com negrito, itálico e links", {
              listItem: "bullet",
              level: 1,
            }),
          ],
        }),
        callout("alone-neutral", "neutral", {
          title: "Neutro, sem emoji",
        }),
        callout("alone-text", "red", { emoji: "⚠️" }),
        sideBySide("two", "Dois lado a lado", [
          callout("two-blue", "blue", { emoji: "🎟️", title: "Ingresso" }),
          callout("two-green", "green", { emoji: "🌿", title: "Natureza" }),
        ]),
        sideBySide("three", "Três lado a lado", [
          callout("three-lightgreen", "lightgreen", {
            emoji: "💧",
            title: "Água",
          }),
          callout("three-yellow", "yellow", { emoji: "☀️", title: "Sol" }),
          callout("three-neutral", "neutral", { title: "Sem emoji" }),
        ]),
        sideBySide("four", undefined, [
          callout("four-purple", "purple", { emoji: "🎉", title: "Festa" }),
          callout("four-blue", "blue", { emoji: "🧘", title: "Calma" }),
          callout("four-red", "red", { emoji: "🚫", title: "Não é não" }),
          callout("four-yellow", "yellow", { emoji: "🏳️‍🌈" }),
        ]),
      ],
      seo: {
        _type: "seo",
        description:
          "Página de exemplo dos callouts, só no ambiente de desenvolvimento.",
        noIndex: true,
      },
    },
    {
      _id: E2E_TEST_PAGE_ID,
      _type: "page",
      title: "Página de teste",
      address: E2E_TEST_PAGE_ADDRESS,
      header: [
        {
          _type: "pageTitle",
          _key: "header",
          title: "Página de teste",
          intro:
            "Página exclusiva dos testes end-to-end: exercita todos os componentes.",
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
              body: paragraphs("Texto de exemplo para os testes end-to-end."),
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
          title: "Aviso",
          body: [
            block("heading", "Seção de teste", { style: "h2" }),
            block("sentinel", E2E_TEST_SENTINEL),
          ],
        },
        {
          _type: "imageSection",
          _key: "image",
          image: {
            _type: "image",
            asset: { _type: "reference", _ref: photoAssetId },
            alt: "Imagem de exemplo dos testes end-to-end",
          },
          caption: "Uma legenda de exemplo",
        },
        statsSection,
        ...chartSections,
        calloutSection,
        sideBySideSection,
        systemComponent,
        rulesSection,
        { ...rulesSection, _key: "private-rules", part: "privateRules" },
      ],
      seo: {
        _type: "seo",
        description: "Página exclusiva dos testes end-to-end.",
        noIndex: true,
      },
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
      notice: [
        linkedParagraph(
          "aviso",
          "Aviso de exemplo do ambiente de desenvolvimento. ",
          "Saiba mais nos eventos",
          "/eventos",
          "",
        ),
      ],
    },
    {
      _id: PAYMENT_MESSAGES_ID,
      _type: "paymentMessages",
      whatsappMessage: SEED_WHATSAPP_PAYMENT_MESSAGE,
    },
    {
      _id: EMAIL_TEMPLATES_ID,
      _type: "emailTemplates",
      application: applicationMailContent,
      paymentConfirmed: paymentConfirmedMailContent,
      paymentLink: paymentLinkMailContent,
      paymentRefund: paymentRefundMailContent,
    },
    likertScale(),
    rules(),
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

type AboutCard = {
  title: string
  body: string
}

type Testimonial = {
  author: string
  quote: string
}

const testimonialQuotes: Testimonial[] = [
  {
    author: "A., 32",
    quote: `"Participei do meu primeiro evento da Positiv com muita insegurança, mas a organização foi impecável. O ambiente respeitoso e as regras claras me fizeram sentir segura o tempo todo. Foi uma experiência libertadora que me ajudou a redescobrir minha sexualidade."`,
  },
  {
    author: "C., 40",
    quote: `"Como casal, estávamos buscando novas experiências para apimentar nosso relacionamento. Os eventos da Positiv superaram nossas expectativas. A seleção criteriosa dos participantes e a organização impecável criaram um ambiente perfeito para explorarmos juntos."`,
  },
  {
    author: "P., 28",
    quote: `"O processo de seleção é rigoroso, mas vale a pena. Nos eventos da Positiv, encontrei pessoas com a mesma mentalidade, abertas a novas experiências e respeitosas. A atmosfera é de liberdade total, mas com limites claros que todos respeitam."`,
  },
]

export const homepageCopy = {
  hero: {
    title: "evento de gente pelada",
    subtitle: `para amantes de saliências **não-mono**, curioses com o mundo da **suruba**, e quem quer explorar a **própria sexualidade**`,
  },
  about: {
    title: "Como assim?",
    cards: {
      notAMess: {
        title: "suruba não é bagunça",
        body: `Nossos eventos são tipo um **piquenique** ou **churras** entre amigues. **Não somos uma balada**.

A diferença? Você pode ficar **pelade** e fazer **sexo** na boa, sem se esconder. É um encontro relax, focado em trocar ideia e estar juntes.`,
      },
      affection: {
        title: "afeto vs putaria",
        body: `Somos muito diferentes de sauna ou casa de swing. Priorizamos **segurança** e **consentimento**.

**Não é sobre putaria, é sobre afeto.**

Incentivamos a **conversa**, a **troca**. Sexo, só com **100% de consentimento** — **ninguém é obrigade a nada**.`,
      },
      forWhom: {
        title: "para quem?",
        body: `Nossos encontros são para pessoas **não-monogâmicas** e **queer**.

Criamos um espaço de **liberdade** e **exploração**, ideal para quem foge do tradicional.

E, claro, nosso evento é para **maiores de 18 anos**.`,
      },
    } as const satisfies Record<string, AboutCard>,
  },
  ctaBanner: {
    title: "Não perca nossos próximos eventos",
    body: `Faça login agora, se inscreva para o próximo evento, ou seja lembrade por quando novas inscrições abrirem`,
    loggedInCta: "Veja os eventos",
    loggedOutCta: "Entrar e conferir",
  },
  feedback: {
    title: "Nos deixe um feedback",
    body: `Estamos sempre buscando melhorias em nossa comunicação e processo. Nos deixe um feedback anônimo (ou não).`,
    cta: "Deixar feedback",
  },
  nextEvents: {
    title: "Próximos Eventos",
    subtitle: "Confira nossos próximos encontros e garanta sua participação.",
    schedule: (date = "", startingTime = "", endingTime = "") =>
      `${date}, das ${startingTime} às ${endingTime}`,
    registrationOpen: `**Inscrições abertas!**`,
    registrationOpensOn: `**Abertura das inscrições:**`,
    alreadyApplied: "Já inscrite!",
    apply: "Participar",
    learnMore: "Entre para saber mais",
  },
  testimonials: {
    title: "Quem vai, nunca esquece",
    subtitle:
      "Experiências reais de algumas pessoas que participaram dos nossos eventos.",
    quotes: testimonialQuotes,
  },
} as const

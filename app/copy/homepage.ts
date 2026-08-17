type AboutCard = {
  title: string
  body: string
}

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
} as const

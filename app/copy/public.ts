import type { z } from "zod"
import type { feedbackFormSchema } from "~/business/feedback/feedback-schema"

type CodeOfConductSection = {
  heading: string
  body: string
}

const codeOfConductSections: readonly CodeOfConductSection[] = [
  {
    heading:
      "1. Tolerância zero a assédio e abuso (incluindo preconceitos diversos)",
    body: `Durante o evento e no grupo que antecede a ele, não serão toleradas atitudes de assédio, abuso, invasão de espaço pessoal, discriminação — racismo, machismo, LGBTfobia, gordofobia e qualquer ação ou comentário que fira a existência de um indivíduo ou grupo — ou comportamentos que coloquem outra pessoa em situação de insegurança ou vulnerabilidade.

Assédio inclui — mas não se limita a:

- Comentários indesejados de cunho sexual ou ofensivo
- Interações (virtuais ou não) sem consentimento
- Insistência de interações (sejam virtuais ou não)
- Tentativas de intimidar, coagir ou manipular.`,
  },
  {
    heading: "2. Compromisso com um espaço seguro",
    body: `Levamos a sério a criação de um espaço seguro para todes.

Por esse motivo, **a presença de pessoas que gerem incômodo, desrespeito ou que não representem segurança para o coletivo será inviabilizada.**

Isso significa que:

- A equipe pode advertir, intervir ou retirar do evento ou do grupo qualquer pessoa cujo comportamento viole este código.
- A decisão dos administradores da Positiv é soberana e tem como objetivo proteger o bem-estar coletivo.

Histórias de assédio que ocorrem **fora** do nosso ecossistema (evento ou grupo gerenciado pela Positiv) e que geram desconfortos, inseguranças e/ou incômodos aos participantes da festa, poderão incorrer na não aceitação da pessoa em nossos eventos, porque ferem, justamente, a segurança coletiva.`,
  },
  {
    heading: "3. Canal oficial para denúncias",
    body: `Temos um canal ativo e permanente para qualquer denúncia, relato ou pedido de apoio: **nosso WhatsApp oficial:** [(11) 94597-0336](https://wa.me/5511945970336)

Se você passar por alguma situação de incômodo, testemunhar algo suspeito ou simplesmente sentir que algo não está certo, **fale com a nossa equipe imediatamente**. Sua segurança é prioridade.`,
  },
  {
    heading: "4. Consentimento é regra",
    body: `Na Positiv:

- Uma pessoa só tem interesse se ela disser claramente que tem.
- “Talvez” é “não”.
- Pessoas alcoolizadas ou com consciência alterada **não podem** consentir.

Perguntar é sexy. Respeitar limites é obrigatório.`,
  },
  {
    heading: "5. Cuidamos uns dos outros",
    body: `Se algo parecer errado, ajude. Se não se sentir confortável para intervir, chame alguém da nossa equipe.

Segurança é responsabilidade coletiva — mas a responsabilidade de agir é nossa também.`,
  },
]

export const feedbackValidation = {
  hasParticipated: "Selecione uma opção",
} as const

export const publicCopy = {
  codeOfConduct: {
    title: "Código de Conduta",
    intro: `Na Positiv, acreditamos que a celebração só existe plenamente quando todas as pessoas se sentem seguras, respeitadas e livres para viver a experiência que pretendemos propiciar. Por isso, assumimos o compromisso de construir e promover um ambiente inclusivo, acolhedor e livre de qualquer forma de violência.`,
    sections: codeOfConductSections,
  },
  feedback: {
    title: "Envie seu Feedback",
    subtitle:
      "Compartilhe aqui anonimamente (ou não) sugestões, críticas ou elogios.",
    scope:
      "A Positiv leva em consideração exclusivamente os feedbacks relacionados com a nossa organização e nosso evento. Nos reservamos a não apurar denúncias de casos ocorridos fora dos nossos espaços.",
    parties:
      "Feedbacks de festas só serão aceitos via o formulário oficial enviado no grupo do WhatsApp do evento.",
    labels: {
      name: "Nome (opcional)",
      email: "E-mail (opcional)",
      whatsapp: "WhatsApp (opcional)",
      hasParticipated: "Já participou de algum evento?",
      feedbackText: "Seu feedback",
      canContact: "Podemos entrar em contato?",
    } as const satisfies Partial<
      Record<keyof z.infer<typeof feedbackFormSchema>, string>
    >,
    descriptions: {
      canContact:
        "Se for o caso, podemos continuar uma comunicação por WhatsApp ou e-mail.",
    } as const satisfies Partial<
      Record<keyof z.infer<typeof feedbackFormSchema>, string>
    >,
    placeholders: {
      name: "Seu nome",
      email: "email@exemplo.com",
      whatsapp: "11999999999",
      feedbackText: "Escreva aqui seu feedback, sugestão ou crítica...",
    } as const satisfies Partial<
      Record<keyof z.infer<typeof feedbackFormSchema>, string>
    >,
    participation: {
      never: "Nunca participei",
      once: "Participei uma vez",
      moreThanOnce: "Participei mais de uma vez",
    },
    validation: feedbackValidation,
    submit: "Enviar Feedback",
    submitting: "Enviando...",
    rateLimited:
      "Você já enviou um feedback recentemente. Por favor, aguarde antes de enviar outro.",
    captchaFailed: "Verificação de segurança falhou",
    success:
      "Obrigado pelo seu feedback! Sua opinião é muito importante para nós.",
  },
} as const

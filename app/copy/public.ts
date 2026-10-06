import type { z } from "zod"
import type { feedbackFormSchema } from "~/business/feedback/feedback-schema"

export const feedbackValidation = {
  hasParticipated: "Selecione uma opção",
} as const

export const publicCopy = {
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
      captchaToken: "Verificação de segurança",
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

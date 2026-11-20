import type { EmailPreferences } from "~/business/newsletter/email-preferences-schema"

export const emailConsentCopy = {
  alwaysSent:
    "Sempre vamos te mandar e-mails sobre sua candidatura, pagamentos, login e sobre os eventos em que você estiver participando. Esses não dá para desligar: sem eles, o sistema não funciona.",
  labels: {
    registrationAlerts:
      "Quero ser avisade quando abrirem as inscrições das festas.",
    newsletter: "Quero receber a newsletter da Positiv.",
    marketing: "Aceito receber divulgações e parcerias.",
  } as const satisfies Record<keyof EmailPreferences, string>,
  descriptions: {
    registrationAlerts:
      "Avisamos quando as inscrições abrem e uns dias antes. Se desmarcar, você não vai mais ser lembrade das festas e pode perder as inscrições.",
    newsletter:
      "Textos nossos, informais, sobre a Positiv e a comunidade. Algumas edições são só para veteranes.",
    marketing: "Novidades de parceiros e ações de divulgação.",
  } as const satisfies Record<keyof EmailPreferences, string>,
  alertsOffWarning:
    "Sem isso, você não vai mais ser lembrade das festas. As inscrições costumam fechar rápido.",
  save: "Salvar",
  saving: "Salvando...",
} as const

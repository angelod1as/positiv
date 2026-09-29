export const homepageCopy = {
  ctaBanner: {
    loggedInCta: "Veja os eventos",
    loggedOutCta: "Entrar e conferir",
  },
  nextEvents: {
    schedule: (date: string, startingTime: string, endingTime: string) =>
      `${date}, das ${startingTime} às ${endingTime}`,
    registrationOpen: `**Candidaturas abertas!**`,
    registrationOpensOn: `**Abertura das candidaturas:**`,
    alreadyApplied: "Já candidate!",
    apply: "Participar",
    learnMore: "Entre para saber mais",
  },
  founders: {
    pronounsLabel: (pronouns: string) => `(${pronouns})`,
    instagramIconAlt: "Instagram icon",
  },
} as const

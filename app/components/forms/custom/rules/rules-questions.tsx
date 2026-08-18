import { rulesQuestionsCopy } from "~/copy/events"

type RulesFormQuestion = {
  question: string
  answers: {
    correct: string[]
    incorrect: string[]
  }
}

const {
  "leave-no-trace": leaveNoTraceCopy,
  "no-obligation": noObligationCopy,
  "no-privacy-1": noPrivacy1Copy,
  "no-privacy-2": noPrivacy2Copy,
  "no-speak-1": noSpeak1Copy,
  "no-speak-2": noSpeak2Copy,
  "no-speak-3": noSpeak3Copy,
  "not-a-club": notAClubCopy,
  phone: phoneCopy,
  "protection-1": protection1Copy,
  "protection-2": protection2Copy,
  trigger: triggerCopy,
  "yes-is-yes": yesIsYesCopy,
  "body-positive": bodyPositiveCopy,
} = rulesQuestionsCopy

export const getRulesFormQuestions = (): Record<
  keyof typeof rulesQuestionsCopy,
  RulesFormQuestion
> => ({
  "leave-no-trace": {
    question: leaveNoTraceCopy.question,
    answers: {
      correct: [leaveNoTraceCopy.answers.everyoneCleans],
      incorrect: [
        leaveNoTraceCopy.answers.motelCleans,
        leaveNoTraceCopy.answers.organizersClean,
      ],
    },
  },
  "no-obligation": {
    question: noObligationCopy.question,
    answers: {
      correct: [noObligationCopy.answers.nobodyIsObliged],
      incorrect: [
        noObligationCopy.answers.everyoneUndresses,
        noObligationCopy.answers.dependsOnLooks,
      ],
    },
  },
  "no-privacy-1": {
    question: noPrivacy1Copy.question,
    answers: {
      correct: [noPrivacy1Copy.answers.stayAtTheParty],
      incorrect: [noPrivacy1Copy.answers.freeWill],
    },
  },
  "no-privacy-2": {
    question: noPrivacy2Copy.question,
    answers: {
      correct: [noPrivacy2Copy.answers.sharedSpacesOnly],
      incorrect: [
        noPrivacy2Copy.answers.secretSpaces,
        noPrivacy2Copy.answers.closedRooms,
      ],
    },
  },
  "no-speak-1": {
    question: noSpeak1Copy.question,
    answers: {
      correct: [noSpeak1Copy.answers.noNamesNoTraits],
      incorrect: [
        noSpeak1Copy.answers.physicalTraitsAreFine,
        noSpeak1Copy.answers.neverSpeakAtAll,
      ],
    },
  },
  "no-speak-2": {
    question: noSpeak2Copy.question,
    answers: {
      correct: [noSpeak2Copy.answers.neverNamesEvenInside],
      incorrect: [noSpeak2Copy.answers.namesAreFineInside],
    },
  },
  "no-speak-3": {
    question: noSpeak3Copy.question,
    answers: {
      correct: [noSpeak3Copy.answers.ownParticipationIsFine],
      incorrect: [
        noSpeak3Copy.answers.notEvenHerself,
        noSpeak3Copy.answers.encouragesOthers,
      ],
    },
  },
  "not-a-club": {
    question: notAClubCopy.question,
    answers: {
      correct: [
        notAClubCopy.answers.moreLikeAPicnic,
        notAClubCopy.answers.drinksInModeration,
      ],
      incorrect: [notAClubCopy.answers.danceAllNight],
    },
  },
  phone: {
    question: phoneCopy.question,
    answers: {
      correct: [phoneCopy.answers.garageOnly],
      incorrect: [phoneCopy.answers.anywhere, phoneCopy.answers.neverAllowed],
    },
  },
  "protection-1": {
    question: protection1Copy.question,
    answers: {
      correct: [
        protection1Copy.answers.condomIsMandatory,
        protection1Copy.answers.couplesToo,
      ],
      incorrect: [protection1Copy.answers.testsInsteadOfCondoms],
    },
  },
  "protection-2": {
    question: protection2Copy.question,
    answers: {
      correct: [
        protection2Copy.answers.regularTesting,
        protection2Copy.answers.glovesAndDams,
      ],
      incorrect: [
        protection2Copy.answers.noNeedToWarn,
        protection2Copy.answers.completelySafe,
      ],
    },
  },
  trigger: {
    question: triggerCopy.question,
    answers: {
      correct: [triggerCopy.answers.readyForIt],
      incorrect: [triggerCopy.answers.needToRethink],
    },
  },
  "yes-is-yes": {
    question: yesIsYesCopy.question,
    answers: {
      correct: [yesIsYesCopy.answers.askedAndConsented],
      incorrect: [
        yesIsYesCopy.answers.assumedInterest,
        yesIsYesCopy.answers.whatsappPromise,
        yesIsYesCopy.answers.partialGroupConsent,
        yesIsYesCopy.answers.escalatedWithoutAsking,
      ],
    },
  },
  "body-positive": {
    question: bodyPositiveCopy.question,
    answers: {
      correct: [
        bodyPositiveCopy.answers.bodyPositiveName,
        bodyPositiveCopy.answers.selfQuestioning,
        bodyPositiveCopy.answers.expandDesire,
      ],
      incorrect: [
        bodyPositiveCopy.answers.standardAestheticOnly,
        bodyPositiveCopy.answers.noResponsibilityForOthers,
      ],
    },
  },
})

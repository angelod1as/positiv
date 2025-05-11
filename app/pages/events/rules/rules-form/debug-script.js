// Helper script to debug the frontend
let rulesFormQuestions = {
  "leave-no-trace": {
    answers: {
      correct: [
        "Cada pessoa é responsável por cuidar de seus pertences e por limpar o ambiente, para manter tudo em ordem e no lugar, independente de ter uma equipe de limpeza que irá limpar depois.",
      ],
    },
  },
  "no-obligation": {
    answers: {
      correct: [
        "Não. A regra é simples: ninguém é obrigade a nada. Se quiser ficar de roupa, pode, se quiser ficar pelade, pode também",
      ],
    },
  },
  "no-privacy-1": {
    answers: {
      correct: [
        "Não está de acordo. O ideal é curtir a festa na própria festa e, principalmente, não tirar ninguém dela antes do fim.",
      ],
    },
  },
  "no-privacy-2": {
    answers: {
      correct: [
        "Essa frase está incorreta. A Positiv tem apenas espaços compartilhados e celebra a coletividade.",
      ],
    },
  },
  "no-speak-1": {
    answers: {
      correct: [
        "Tudo lindo! Falar sobre a Positiv é essencial pro crescimento da própria Positiv, desde que você não cite nomes nem características de quem esteve na festa com você.",
      ],
    },
  },
  "no-speak-2": {
    answers: {
      correct: [
        "A regra é clara: não se fala sobre quem vai à Positiv — mesmo para pessoas que vão à Positiv durante uma Positiv.",
      ],
    },
  },
  "no-speak-3": {
    answers: {
      correct: [
        "Desde que ela não diga quem vai ou foi à festa com ela, tudo bem — ela pode divulgar sua participação.",
      ],
    },
  },
  "not-a-club": {
    answers: {
      correct: [
        "A frase está incorreta. A Positiv se parece mais com um picnic e não tem música alta ou luzes piscando.",
        "A frase está incorreta. É até possível que haja drinks ou cerveja, mas a moderação é essencial.",
      ],
    },
  },
  phone: {
    answers: {
      correct: [
        "Incorreta, o uso dos celulares é permitido apenas na garagem da suíte.",
      ],
    },
  },
  "protection-1": {
    answers: {
      correct: [
        "a afirmação está incorreta, o uso de camisinha interna ou externa, é obrigatório",
        "a afirmação está incorreta e até mesmo casais que não usam camisinha fora da festa são obrigados a usar durante a festa",
      ],
    },
  },
  "protection-2": {
    answers: {
      correct: [
        "a Positiv não pede que seus participantes enviem resultados de exames de IST para a organização, mas prega que todes façam regularmente seus acompanhamentos, porque assumimos riscos em frequentar festas como a Positiv",
        "para interações com mãos e bocas, a Positiv recomenda fortemente que sejam usadas luvas, dental dams e/ou camisinhas.",
      ],
    },
  },
  trigger: {
    answers: {
      correct: [
        "Sim, fiz uma autoanálise e tô legal. Entendo meus gatilhos e tô preparade para enfrentar meus medos e inseguranças.",
      ],
    },
  },
  "yes-is-yes": {
    answers: {
      correct: [
        'Senti que um clima rolou na festa. Perguntei: posso te dar um beijo? A pessoa consentiu com um "sim". Nos beijamos. Ela perguntou: "posso fazer um cafuné?" e eu disse que sim.',
      ],
    },
  },
}

// Loop through and find/check/click matching inputs
Object.entries(rulesFormQuestions).forEach(([_questionKey, { answers }]) => {
  answers.correct.forEach((correctValue) => {
    const escapedValue = CSS.escape(correctValue)

    // ✅ RadioGroup — already working
    document
      .querySelectorAll(`div[data-slot="radio-group"]`)
      .forEach((group) => {
        group
          .querySelectorAll(
            `[data-slot="radio-group-item"][value="${escapedValue}"]`,
          )
          .forEach((radioItem) => {
            if (!radioItem.checked) {
              radioItem.click() // Simulate a click to select the radio
            }
          })
      })

    // ✅ Checkboxes — fixed to support multiple correct answers
    document.querySelectorAll('label[data-slot="label"]').forEach((label) => {
      const text = label.textContent?.trim().replace(/\s+/g, " ")

      if (text === correctValue.trim().replace(/\s+/g, " ")) {
        const checkboxId = label.getAttribute("for")
        const checkboxButton = document.getElementById(checkboxId)

        if (
          checkboxButton &&
          checkboxButton.getAttribute("aria-checked") !== "true"
        ) {
          checkboxButton.click() // Simulate a click to toggle the checkbox
        }
      }
    })
  })
})

console.info("\n\nRUN ME AGAIN!\n\n")

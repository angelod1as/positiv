import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Flow } from "./flow.types"
import type { Question } from "./question.types"
import { useFormRuntime } from "./use-form-runtime"

const question = (id: string): Question => ({
  id,
  prompt: `Pergunta ${id}`,
  input: { kind: "text" },
  schema: zod.string().min(1, { message: "Resposta obrigatória" }),
})

const questions = [question("a"), question("b"), question("c")]

const linearFlow: Flow = {
  start: "a",
  steps: {
    a: { kind: "question", id: "a" },
    b: { kind: "question", id: "b" },
    c: { kind: "question", id: "c" },
  },
  next: (current) => {
    if (current === "a") return "b"
    if (current === "b") return "c"
    return "done"
  },
}

describe("useFormRuntime", () => {
  it("starts on the flow's first step", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    expect(result.current.currentStepId).toBe("a")
    expect(result.current.isDone).toBe(false)
  })

  it("opens with the answers it was handed", () => {
    const { result } = renderHook(() =>
      useFormRuntime({
        questions,
        flow: linearFlow,
        initialAnswers: { a: "Ana", b: "Bahia" },
      }),
    )

    expect(result.current.answers).toEqual({ a: "Ana", b: "Bahia" })
  })

  it("advances on an answer it was handed, without it being retyped", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({
        questions,
        flow: linearFlow,
        initialAnswers: { a: "Ana" },
      }),
    )

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("b")
  })

  it("exposes the questions belonging to the current step", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    expect(result.current.currentQuestions.map((q) => q.id)).toEqual(["a"])
  })

  it("advances one step at a time as questions are answered", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })
    expect(result.current.currentStepId).toBe("b")

    await act(async () => {
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })
    expect(result.current.currentStepId).toBe("c")
  })

  it("collects every answer given along the way", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })

    expect(result.current.answers).toEqual({
      a: "resposta a",
      b: "resposta b",
    })
  })

  it("finishes when the flow resolves to done", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    for (const id of ["a", "b", "c"]) {
      await act(async () => {
        result.current.answer(id, `resposta ${id}`)
        await result.current.advance()
      })
    }

    expect(result.current.isDone).toBe(true)
  })
})

const correctness = (id: string, right: string): Question => ({
  id,
  prompt: `Pergunta ${id}`,
  input: {
    kind: "radio",
    options: [
      { label: "Certa", value: right },
      { label: "Errada", value: "errada" },
    ],
  },
  schema: zod
    .string()
    .min(1, { message: "Resposta obrigatória" })
    .refine((answer) => answer === right, {
      message: "Você escolheu a resposta errada",
    }),
})

const quizQuestions = [correctness("a", "certa"), question("b")]

const quizFlow: Flow = {
  start: "a",
  steps: {
    a: { kind: "question", id: "a" },
    b: { kind: "question", id: "b" },
  },
  next: (current) => (current === "a" ? "b" : "done"),
}

const screenFlow: Flow = {
  start: "both",
  steps: { both: { kind: "screen", ids: ["a", "b"] } },
  next: () => "done",
}

describe("useFormRuntime validation gating", () => {
  it("refuses to advance while the current answer is invalid", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: quizFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("a")
  })

  it("exposes the question's own error message when it blocks", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: quizFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })

    expect(result.current.errors.a).toBe("Você escolheu a resposta errada")
  })

  it("blocks when the question was never answered", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: quizFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("a")
    expect(result.current.errors.a).toBeDefined()
  })

  it("advances and clears the error once the answer is corrected", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: quizFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("a", "certa")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("b")
    expect(result.current.errors.a).toBeUndefined()
  })

  it("blocks a multi-question screen and flags only the invalid question", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: screenFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })

    expect(result.current.isDone).toBe(false)
    expect(result.current.errors.a).toBe("Você escolheu a resposta errada")
    expect(result.current.errors.b).toBeUndefined()
  })
})

describe("useFormRuntime cross-question validation", () => {
  const crossQuestions: Question[] = [
    question("password"),
    {
      ...question("confirmPassword"),
      refine: (value, answers) =>
        value === answers.password
          ? null
          : { ok: false, message: "As senhas não são iguais" },
    },
  ]

  const screenFlow: Flow = {
    start: "screen",
    steps: {
      screen: { kind: "screen", ids: ["password", "confirmPassword"] },
    },
    next: () => "done",
  }

  it("blocks an advance when a refine disagrees with another answer", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: crossQuestions, flow: screenFlow }),
    )

    act(() => {
      result.current.answer("password", "segredo123")
      result.current.answer("confirmPassword", "outra")
    })

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.errors.confirmPassword).toBe(
      "As senhas não são iguais",
    )
    expect(result.current.isDone).toBe(false)
  })

  it("shows a refine the other answers as their own questions read them", async () => {
    const seen: unknown[] = []
    const booleanPair: Question[] = [
      {
        id: "agree",
        prompt: "Estou de acordo",
        input: { kind: "boolean" },
        schema: zod.boolean(),
      },
      {
        id: "mktEmails",
        prompt: "Quero receber novidades",
        input: { kind: "boolean" },
        schema: zod.boolean(),
        refine: (_value, answers) => {
          seen.push(answers.agree)
          return null
        },
      },
    ]

    const screenFlow: Flow = {
      start: "screen",
      steps: { screen: { kind: "screen", ids: ["agree", "mktEmails"] } },
      next: () => "done",
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions: booleanPair, flow: screenFlow }),
    )

    // Nobody ticked either box. The refine must read the other one as false,
    // which is what its own question's rules say it is.
    await act(async () => {
      await result.current.advance()
    })

    expect(seen).toEqual([false])
  })

  it("advances once the refine agrees", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: crossQuestions, flow: screenFlow }),
    )

    act(() => {
      result.current.answer("password", "segredo123")
      result.current.answer("confirmPassword", "segredo123")
    })

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.errors.confirmPassword).toBeUndefined()
    expect(result.current.isDone).toBe(true)
  })
})

describe("useFormRuntime content steps", () => {
  const contentFlow: Flow = {
    start: "intro",
    steps: {
      intro: { kind: "content", render: "Leia as regras" },
      a: { kind: "question", id: "a" },
    },
    next: (current) => (current === "intro" ? "a" : "done"),
  }

  it("has no questions to answer on a content step", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: contentFlow }),
    )

    expect(result.current.currentQuestions).toEqual([])
  })

  it("exposes the content so a presentation can render it", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: contentFlow }),
    )

    expect(result.current.currentStep).toEqual({
      kind: "content",
      render: "Leia as regras",
    })
  })

  it("advances past a content step without requiring an answer", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: contentFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("a")
    expect(result.current.errors).toEqual({})
  })

  it("collects no answer for a content step", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: contentFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.answers).toEqual({})
  })
})

describe("useFormRuntime branching", () => {
  const branchingFlow: Flow = {
    start: "a",
    steps: {
      a: { kind: "question", id: "a" },
      b: { kind: "question", id: "b" },
      c: { kind: "question", id: "c" },
    },
    next: (current, answers) => {
      if (current === "a") return answers.a === "pular" ? "c" : "b"
      if (current === "b") return "c"
      return "done"
    },
  }

  it("routes to the step the flow chooses for the given answer", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: branchingFlow }),
    )

    await act(async () => {
      result.current.answer("a", "pular")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("c")
  })

  it("takes the other branch for a different answer", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: branchingFlow }),
    )

    await act(async () => {
      result.current.answer("a", "seguir")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("b")
  })

  it("passes caller-supplied data to the flow resolver", async () => {
    const seen: Record<string, unknown>[] = []
    const dataFlow: Flow = {
      start: "a",
      steps: { a: { kind: "question", id: "a" } },
      next: (_current, _answers, context) => {
        seen.push(context.data)
        return "done"
      },
    }

    const { result } = renderHook(() =>
      useFormRuntime({
        questions,
        flow: dataFlow,
        data: { isVeteran: true },
      }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })

    // The runtime also resolves the flow to project how long the run is, so
    // how many times `next` was called is not the point — what it was handed is.
    expect(seen.length).toBeGreaterThan(0)
    for (const data of seen) {
      expect(data).toEqual({ isVeteran: true })
    }
  })
})

describe("useFormRuntime first-try tracking", () => {
  const probes = [correctness("a", "certa"), correctness("b", "certa")]

  const probeFlow: Flow = {
    start: "a",
    steps: {
      a: { kind: "question", id: "a" },
      b: { kind: "question", id: "b" },
    },
    next: (current) => (current === "a" ? "b" : "done"),
  }

  it("records a question answered correctly on the first attempt", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: probes, flow: probeFlow }),
    )

    await act(async () => {
      result.current.answer("a", "certa")
      await result.current.advance()
    })

    expect(result.current.firstTryCorrect.a).toBe(true)
  })

  it("records a first-attempt mistake even after it is corrected", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: probes, flow: probeFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("a", "certa")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("b")
    expect(result.current.firstTryCorrect.a).toBe(false)
  })

  it("does not count an unanswered advance as a first-attempt mistake", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: probes, flow: probeFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("a", "certa")
      await result.current.advance()
    })

    expect(result.current.firstTryCorrect.a).toBe(true)
  })

  it("lets a flow branch on first-attempt mistakes", async () => {
    // The POS-484 veteran rule: fumbling both probes on the first attempt
    // drops the person into the full quiz, even though gating forced them
    // to correct both answers before moving on.
    const veteranFlow: Flow = {
      start: "a",
      steps: {
        a: { kind: "question", id: "a" },
        b: { kind: "question", id: "b" },
        full: { kind: "question", id: "c" },
      },
      next: (current, _answers, context) => {
        if (current === "a") return "b"
        if (current === "b") {
          const fumbled = ["a", "b"].filter(
            (id) => context.firstTryCorrect[id] === false,
          )
          return fumbled.length === 2 ? "full" : "done"
        }
        return "done"
      },
    }

    const allQuestions = [...probes, question("c")]

    const { result } = renderHook(() =>
      useFormRuntime({ questions: allQuestions, flow: veteranFlow }),
    )

    for (const id of ["a", "b"]) {
      await act(async () => {
        result.current.answer(id, "errada")
        await result.current.advance()
      })
      await act(async () => {
        result.current.answer(id, "certa")
        await result.current.advance()
      })
    }

    expect(result.current.currentStepId).toBe("full")
  })

  it("sends a veteran who fumbles only one probe straight to done", async () => {
    const veteranFlow: Flow = {
      start: "a",
      steps: {
        a: { kind: "question", id: "a" },
        b: { kind: "question", id: "b" },
        full: { kind: "question", id: "c" },
      },
      next: (current, _answers, context) => {
        if (current === "a") return "b"
        if (current === "b") {
          const fumbled = ["a", "b"].filter(
            (id) => context.firstTryCorrect[id] === false,
          )
          return fumbled.length === 2 ? "full" : "done"
        }
        return "done"
      },
    }

    const allQuestions = [...probes, question("c")]

    const { result } = renderHook(() =>
      useFormRuntime({ questions: allQuestions, flow: veteranFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("a", "certa")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("b", "certa")
      await result.current.advance()
    })

    expect(result.current.isDone).toBe(true)
  })
})

describe("useFormRuntime clearing an error", () => {
  it("takes the error off a question as soon as it is answered", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.errors.a).toBeTruthy()

    // Leaving it up while the person types or picks reads as "still wrong", and
    // sends them clicking the button again to find out.
    await act(async () => {
      result.current.answer("a", "resposta a")
    })

    expect(result.current.errors.a).toBeUndefined()
  })

  it("leaves the other questions on a shared screen alone", async () => {
    const screenFlow: Flow = {
      start: "tudo",
      steps: { tudo: { kind: "screen", ids: ["a", "b"] } },
      next: () => "done",
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: screenFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })

    await act(async () => {
      result.current.answer("a", "resposta a")
    })

    expect(result.current.errors.a).toBeUndefined()
    expect(result.current.errors.b).toBeTruthy()
  })
})

describe("useFormRuntime progress", () => {
  const commitFlow: Flow = {
    start: "a",
    steps: {
      a: { kind: "question", id: "a" },
      b: { kind: "question", id: "b" },
      commit: { kind: "commit", run: async () => ({ ok: true }) },
    },
    next: (current) => {
      if (current === "a") return "b"
      if (current === "b") return "commit"
      return "done"
    },
  }

  it("reports where the run is along the path the flow projects", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    expect(result.current.progress).toEqual({ index: 1, total: 3 })
  })

  it("moves as the run advances", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })

    expect(result.current.progress).toEqual({ index: 2, total: 3 })
  })

  it("leaves commit steps out of the count", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: commitFlow }),
    )

    expect(result.current.progress).toEqual({ index: 1, total: 2 })
  })

  it("counts a content step, which is a screen like any other", () => {
    const contentFlow: Flow = {
      start: "intro",
      steps: {
        intro: { kind: "content", render: null },
        a: { kind: "question", id: "a" },
      },
      next: (current) => (current === "intro" ? "a" : "done"),
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: contentFlow }),
    )

    expect(result.current.progress).toEqual({ index: 1, total: 2 })
  })

  it("reports nothing for a flow with a single screen", () => {
    const singleFlow: Flow = {
      start: "a",
      steps: { a: { kind: "question", id: "a" } },
      next: () => "done",
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: singleFlow }),
    )

    expect(result.current.progress).toBeNull()
  })

  it("lengthens the total once a stumble sends the run down the long path", async () => {
    const probeQuestions = [
      correctness("a", "certa"),
      correctness("b", "certa"),
      question("c"),
      question("d"),
    ]

    const probeFlow: Flow = {
      start: "a",
      steps: {
        a: { kind: "question", id: "a" },
        b: { kind: "question", id: "b" },
        c: { kind: "question", id: "c" },
        d: { kind: "question", id: "d" },
      },
      next: (current, _answers, context) => {
        if (current === "a") return "b"

        if (current === "b") {
          const stumbled =
            context.firstTryCorrect.a === false &&
            context.firstTryCorrect.b === false

          return stumbled ? "c" : "done"
        }

        if (current === "c") return "d"
        return "done"
      },
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions: probeQuestions, flow: probeFlow }),
    )

    expect(result.current.progress).toEqual({ index: 1, total: 2 })

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("a", "certa")
      await result.current.advance()
    })

    // One stumble is not enough to branch, so the projection is still short.
    expect(result.current.progress).toEqual({ index: 2, total: 2 })

    await act(async () => {
      result.current.answer("b", "errada")
      await result.current.advance()
    })

    expect(result.current.progress).toEqual({ index: 2, total: 4 })
  })
})

describe("useFormRuntime going back", () => {
  it("has nowhere to go back to on the first step", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    expect(result.current.canGoBack).toBe(false)
  })

  it("can go back once the run has moved on", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })

    expect(result.current.canGoBack).toBe(true)
  })

  it("shows the previous step with the answer that was left there", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })

    act(() => {
      result.current.goBack()
    })

    expect(result.current.currentStepId).toBe("a")
    expect(result.current.answers.a).toBe("resposta a")
  })

  it("ignores a request to go back from the first step", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    act(() => {
      result.current.goBack()
    })

    expect(result.current.currentStepId).toBe("a")
  })

  it("leaves firstTryCorrect alone when an answer is changed on the way back", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: quizFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("a", "certa")
      await result.current.advance()
    })

    expect(result.current.firstTryCorrect.a).toBe(false)

    act(() => {
      result.current.goBack()
    })

    await act(async () => {
      result.current.answer("a", "certa")
      await result.current.advance()
    })

    expect(result.current.firstTryCorrect.a).toBe(false)
  })

  it("says what a refusal said, when it named no question", async () => {
    const refusingFlow: Flow = {
      start: "a",
      steps: {
        a: { kind: "question", id: "a" },
        save: {
          kind: "commit",
          run: () => ({
            ok: false as const,
            errors: [],
            message: "Inscrições encerradas",
          }),
        },
      },
      next: (current) => (current === "a" ? "save" : "done"),
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: refusingFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })

    expect(result.current.formError).toBe("Inscrições encerradas")
  })

  it("drops a failure that belongs to the step being left", async () => {
    const failingFlow: Flow = {
      start: "a",
      steps: {
        a: { kind: "question", id: "a" },
        b: { kind: "question", id: "b" },
        save: {
          kind: "commit",
          run: () => {
            throw new Error("rede caiu")
          },
        },
      },
      next: (current) => {
        if (current === "a") return "b"
        if (current === "b") return "save"
        return "done"
      },
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: failingFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })

    expect(result.current.formError).not.toBeNull()

    act(() => {
      result.current.goBack()
    })

    expect(result.current.currentStepId).toBe("a")
    expect(result.current.formError).toBeNull()
  })
})

describe("useFormRuntime refused advance", () => {
  it("has nothing refused before anyone tries to advance", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: screenFlow }),
    )

    expect(result.current.advanceRejection).toBeNull()
  })

  it("names the questions that refused the advance", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: screenFlow }),
    )

    await act(async () => {
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })

    expect(result.current.advanceRejection?.questionIds).toEqual(["a"])
  })

  it("hands out a fresh signal on every refusal, so a second try reads as one", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: screenFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })
    const first = result.current.advanceRejection

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.advanceRejection).not.toBe(first)
    expect(result.current.advanceRejection?.questionIds).toEqual(["a", "b"])
  })

  it("clears the signal once the advance goes through", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: screenFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })
    expect(result.current.advanceRejection).not.toBeNull()

    await act(async () => {
      result.current.answer("a", "certa")
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })

    expect(result.current.advanceRejection).toBeNull()
  })

  it("clears the signal when the run walks back", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })
    await act(async () => {
      await result.current.advance()
    })
    expect(result.current.advanceRejection).not.toBeNull()

    act(() => {
      result.current.goBack()
    })

    expect(result.current.advanceRejection).toBeNull()
  })
})

describe("useFormRuntime refusal order", () => {
  // A digit-only key is reordered ahead of the rest by every JS engine, so the
  // refusing questions are collected in the order the step asks them rather
  // than read back off an object.
  it("names the refusing questions in the order the screen asks them", async () => {
    const numbered = [question("nome"), question("2"), question("1")]
    const numberedFlow: Flow = {
      start: "tela",
      steps: { tela: { kind: "screen", ids: ["nome", "2", "1"] } },
      next: () => "done",
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions: numbered, flow: numberedFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.advanceRejection?.questionIds).toEqual([
      "nome",
      "2",
      "1",
    ])
  })
})

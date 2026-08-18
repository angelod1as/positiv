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

    expect(seen).toEqual([{ isVeteran: true }])
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

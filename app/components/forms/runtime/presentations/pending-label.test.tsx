import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { sharedCopy } from "~/copy/shared"
import { zod } from "~/lib/helpers/zod"
import type { CommitResult } from "~types/forms/commit.types"
import type { Flow } from "../flow.types"
import { FormRunner } from "../form-runner"
import type { Presentation } from "./presentation.types"
import type { Question } from "../question.types"
import { AllAtOnce } from "./all-at-once"
import { gridPresentation } from "./grid"
import { OneAtATime } from "./one-at-a-time"

const questions: Question[] = [
  {
    id: "nome",
    prompt: "Qual seu nome?",
    input: { kind: "text" },
    schema: zod.string().min(1),
  },
]

/** A commit that never answers, so the run stays in flight to be looked at. */
const flowThatHangs = (): Flow => ({
  start: "tela",
  steps: {
    tela: { kind: "screen", ids: ["nome"] },
    salvar: {
      kind: "commit",
      run: () => new Promise<CommitResult>(() => {}),
    },
  },
  next: (current) => (current === "tela" ? "salvar" : "done"),
})

const Grid = gridPresentation([{ kind: "question", id: "nome", span: 12 }])

const presentations: Array<[string, Presentation]> = [
  ["AllAtOnce", AllAtOnce],
  ["Grid", Grid],
  ["OneAtATime", OneAtATime],
]

describe.each(presentations)("%s while a commit is in flight", (_, presentation) => {
  it("says the form is working, instead of only greying the button out", async () => {
    const user = userEvent.setup()
    render(
      <FormRunner
        questions={questions}
        flow={flowThatHangs()}
        presentation={presentation}
        continueLabel="Enviar"
      />,
    )

    await user.type(screen.getByLabelText("Qual seu nome?"), "Angela")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: sharedCopy.status.loading }),
      ).toBeDisabled(),
    )
  })

  it("says it in the caller's own words when it gave any", async () => {
    const user = userEvent.setup()
    render(
      <FormRunner
        questions={questions}
        flow={flowThatHangs()}
        presentation={presentation}
        continueLabel="Entrar"
        pendingLabel="Entrando..."
      />,
    )

    await user.type(screen.getByLabelText("Qual seu nome?"), "Angela")
    await user.click(screen.getByRole("button", { name: "Entrar" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Entrando..." })).toBeDisabled(),
    )
  })
})

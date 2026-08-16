import { useState } from "react"
import type { Flow } from "~/components/forms/runtime/flow.types"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { allAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import { oneAtATime } from "~/components/forms/runtime/presentations/one-at-a-time"
import type { Answers, Question } from "~/components/forms/runtime/question.types"
import { Button } from "~/components/atoms/button/button"
import { zod } from "~/lib/helpers/zod"

const questions: Question[] = [
  {
    id: "nome",
    prompt: "Como podemos te chamar?",
    help: "Nome, apelido, o que você preferir.",
    input: { kind: "text" },
    schema: zod.string().min(2, { message: "Escreva ao menos duas letras" }),
  },
  {
    id: "veterane",
    prompt: "Você já participou de algum evento?",
    input: {
      kind: "radio",
      options: [
        { label: "Sim, já fui", value: "sim" },
        { label: "Ainda não", value: "nao" },
      ],
    },
    schema: zod.string().min(1, { message: "Escolha uma opção" }),
  },
  {
    id: "quiz",
    prompt: "Quem é responsável por limpar o ambiente?",
    help: "Só a resposta correta avança — é assim que o quiz de regras vai funcionar.",
    input: {
      kind: "radio",
      options: [
        { label: "Cada pessoa cuida do que é seu", value: "certa" },
        { label: "A equipe de limpeza resolve depois", value: "errada" },
      ],
    },
    schema: zod
      .string()
      .min(1, { message: "Escolha uma opção" })
      .refine((answer) => answer === "certa", {
        message: "Você escolheu a resposta errada",
      }),
  },
  {
    id: "email",
    prompt: "Qual seu e-mail?",
    help: 'Digite "ocupado@positiv.com" para ver o servidor recusar e o fluxo voltar para cá.',
    input: { kind: "text" },
    schema: zod.string().email({ message: "E-mail inválido" }),
  },
]

const commitStep = {
  kind: "commit" as const,
  run: (answers: Answers) => {
    if (answers.email === "ocupado@positiv.com") {
      return {
        ok: false,
        errors: [
          { questionId: "email", message: "Este e-mail já está cadastrado" },
        ],
      }
    }
    return { ok: true as const }
  },
}

/** Uma pergunta por step. O quiz só aparece para quem nunca participou. */
const steppedFlow: Flow = {
  start: "intro",
  steps: {
    intro: {
      kind: "content",
      render: (
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">Antes de começar</h2>
          <p>
            Esta é uma tela de conteúdo. Ela não coleta nada e não exige
            resposta — serve para textos, avisos e telas de "continuar".
          </p>
        </div>
      ),
    },
    nome: { kind: "question", id: "nome" },
    veterane: { kind: "question", id: "veterane" },
    quiz: { kind: "question", id: "quiz" },
    email: { kind: "question", id: "email" },
    salvar: commitStep,
  },
  next: (current, answers) => {
    if (current === "intro") return "nome"
    if (current === "nome") return "veterane"
    // Quem já participou pula o quiz. Ramificação decidida pela resposta.
    if (current === "veterane")
      return answers.veterane === "sim" ? "email" : "quiz"
    if (current === "quiz") return "email"
    if (current === "email") return "salvar"
    return "done"
  },
}

/**
 * As mesmas perguntas num único step de tela. Sem ramificação: não dá para
 * saber quais perguntas se aplicam antes de respondê-las, então um fluxo de
 * tela única é necessariamente linear.
 */
const singleScreenFlow: Flow = {
  start: "tudo",
  steps: {
    tudo: { kind: "screen", ids: ["nome", "veterane", "email"] },
    salvar: commitStep,
  },
  next: (current) => (current === "tudo" ? "salvar" : "done"),
}

export default function FormRuntimeDemoPage() {
  const [shape, setShape] = useState<"stepped" | "single">("stepped")
  const [result, setResult] = useState<Answers | null>(null)
  const [runId, setRunId] = useState(0)

  const restart = (next: "stepped" | "single") => {
    setShape(next)
    setResult(null)
    setRunId((id) => id + 1)
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Runtime de formulários</h1>
        <p className="text-muted-foreground">
          Página de desenvolvimento. Exercita validação por pergunta, tela de
          conteúdo, ramificação condicional e um commit que falha e devolve o
          fluxo para a pergunta recusada.
        </p>
        <p className="text-muted-foreground">
          Os dois botões trocam o <strong>fluxo</strong>, não só a aparência.
          Quantas perguntas dividem uma tela é decisão do fluxo; a apresentação
          cuida do enquadramento.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={shape === "stepped" ? "default" : "outline"}
          onClick={() => restart("stepped")}
        >
          Uma por tela, com ramificação
        </Button>
        <Button
          type="button"
          variant={shape === "single" ? "default" : "outline"}
          onClick={() => restart("single")}
        >
          Tela única, linear
        </Button>
      </div>

      {result ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Respostas coletadas</h2>
          <pre className="overflow-x-auto rounded bg-muted p-4 text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
          <Button
            type="button"
            onClick={() => {
              setResult(null)
              setRunId((id) => id + 1)
            }}
          >
            Começar de novo
          </Button>
        </div>
      ) : (
        <FormRunner
          key={runId}
          questions={questions}
          flow={shape === "stepped" ? steppedFlow : singleScreenFlow}
          presentation={shape === "stepped" ? oneAtATime : allAtOnce}
          onDone={setResult}
        />
      )}
    </main>
  )
}

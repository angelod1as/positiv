import { useState } from "react"
import type { Flow } from "~/components/forms/runtime/flow.types"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import {
  clearRuntimeState,
  runtimeStorageKey,
} from "~/components/forms/runtime/persistence"
import { AllAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import { OneAtATime } from "~/components/forms/runtime/presentations/one-at-a-time"
import type {
  Answers,
  Question,
} from "~/components/forms/runtime/question.types"
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
    id: "cidade",
    prompt: "Em que cidade você mora?",
    input: {
      kind: "select",
      options: [
        { label: "São Paulo", value: "sp" },
        { label: "Rio de Janeiro", value: "rj" },
        { label: "Outra", value: "outra" },
      ],
    },
    schema: zod.string().min(1, { message: "Escolha uma cidade" }),
  },
  {
    id: "espacos",
    prompt: "Quais espaços te interessam?",
    help: "Pode marcar mais de um. Testa grupo de checkbox e resposta em lista.",
    input: {
      kind: "checkbox",
      options: [
        { label: "Sala compartilhada", value: "sala" },
        { label: "Cozinha", value: "cozinha" },
        { label: "Área externa", value: "externa" },
      ],
    },
    schema: zod.array(zod.string()).refine((chosen) => chosen.length > 0, {
      message: "Escolha ao menos um espaço",
    }),
  },
  {
    id: "notas",
    prompt: "Quer nos contar mais alguma coisa?",
    help: "Campo livre, opcional — dá para seguir sem escrever nada.",
    input: { kind: "textarea" },
    schema: zod.string().optional(),
  },
  {
    id: "email",
    prompt: "Qual seu e-mail?",
    help: 'Endereços especiais: "ocupado@positiv.com" recusa, "erro@positiv.com" estoura, "lento@positiv.com" demora.',
    input: { kind: "text" },
    schema: zod.string().email({ message: "E-mail inválido" }),
  },
]

const commitStep = {
  kind: "commit" as const,
  run: async (answers: Answers) => {
    if (answers.email === "lento@positiv.com") {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      return { ok: true as const }
    }

    if (answers.email === "erro@positiv.com") {
      throw new Error("simulated network failure")
    }

    const errors = []
    if (answers.nome === "Recusado") {
      errors.push({ questionId: "nome", message: "Este nome não é permitido" })
    }
    if (answers.email === "ocupado@positiv.com") {
      errors.push({
        questionId: "email",
        message: "Este e-mail já está cadastrado",
      })
    }

    return errors.length > 0
      ? { ok: false as const, errors }
      : { ok: true as const }
  },
}

/** One question per step. The quiz only appears for a first-time attendee. */
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
    cidade: { kind: "question", id: "cidade" },
    espacos: { kind: "question", id: "espacos" },
    notas: { kind: "question", id: "notas" },
    email: { kind: "question", id: "email" },
    salvar: commitStep,
  },
  next: (current, answers) => {
    if (current === "intro") return "nome"
    if (current === "nome") return "veterane"
    // Someone who has attended before skips the quiz.
    if (current === "veterane")
      return answers.veterane === "sim" ? "cidade" : "quiz"
    if (current === "quiz") return "cidade"
    if (current === "cidade") return "espacos"
    if (current === "espacos") return "notas"
    if (current === "notas") return "email"
    if (current === "email") return "salvar"
    return "done"
  },
}

/**
 * The same questions in a single screen step. No branching: which questions
 * apply cannot be known before they are answered, so a single-screen flow is
 * necessarily linear.
 */
const singleScreenFlow: Flow = {
  start: "tudo",
  steps: {
    tudo: {
      kind: "screen",
      ids: ["nome", "veterane", "cidade", "espacos", "notas", "email"],
    },
    salvar: commitStep,
  },
  next: (current) => (current === "tudo" ? "salvar" : "done"),
}

export default function FormRuntimeDemoPage() {
  const [shape, setShape] = useState<"stepped" | "single">("stepped")
  const [result, setResult] = useState<Answers | null>(null)
  const [runId, setRunId] = useState(0)

  const storageKey = runtimeStorageKey("demo", shape)

  const restart = (next: "stepped" | "single") => {
    setShape(next)
    setResult(null)
    setRunId((id) => id + 1)
  }

  const forget = () => {
    clearRuntimeState(storageKey)
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
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          <li>
            Nome <strong>Recusado</strong> e e-mail{" "}
            <strong>ocupado@positiv.com</strong> juntos: o servidor recusa os
            dois, e o fluxo passa por cada um antes de tentar salvar de novo.
          </li>
          <li>
            E-mail <strong>erro@positiv.com</strong>: o commit estoura, e a
            falha aparece sem culpar nenhuma pergunta.
          </li>
          <li>
            E-mail <strong>lento@positiv.com</strong>: o commit demora três
            segundos. O botão fica desabilitado enquanto isso, e um segundo
            Enter não envia de novo.
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-2 rounded border p-4">
        <h2 className="text-xl font-bold">Persistência</h2>
        <p className="text-muted-foreground">
          Responda algumas perguntas e dê F5: o fluxo volta na mesma tela, com
          as respostas preenchidas. Cada formato tem o seu próprio registro, e
          concluir o fluxo apaga o registro daquele formato.
        </p>
        <p className="text-muted-foreground">
          Para o registro <strong>não</strong> ser apagado ao concluir — útil
          para percorrer o fluxo várias vezes sem responder tudo de novo —
          guarde isto no <code>sessionStorage</code>, na chave{" "}
          <code>{storageKey}</code>:
        </p>
        <pre className="overflow-x-auto rounded bg-muted p-4 text-sm">
          {'{"v":1,"keepOnDone":true}'}
        </pre>
        <p className="text-muted-foreground">
          Funciona antes de começar ou no meio do fluxo. É um campo do próprio
          registro, então vale em produção do mesmo jeito.
        </p>
        <p className="text-muted-foreground">
          Com a flag, depois de concluir o F5 devolve a última pergunta em vez
          de recomeçar, e seguir dali <strong>roda o commit de novo</strong> —
          que é o ponto de repetir o fluxo. Num formulário de verdade isso
          significa uma segunda candidatura.
        </p>
        <div>
          <Button type="button" variant="outline" onClick={forget}>
            Apagar o registro deste formato
          </Button>
        </div>
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
          presentation={shape === "stepped" ? OneAtATime : AllAtOnce}
          persistence={{ formId: "demo", scopeId: shape }}
          onDone={setResult}
        />
      )}
    </main>
  )
}

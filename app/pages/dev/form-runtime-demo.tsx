import { useState } from "react"
import type { Flow } from "~/components/forms/runtime/flow.types"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import {
  clearRuntimeState,
  runtimeStorageKey,
} from "~/components/forms/runtime/persistence"
import { AllAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import { OneAtATime } from "~/components/forms/runtime/presentations/one-at-a-time"
import type { Presentation } from "~/components/forms/runtime/presentations/presentation.types"
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
    input: { kind: "email" },
    schema: zod.string().email({ message: "E-mail inválido" }),
  },
]

/** A word no browser can break, which is what finds a missing overflow-wrap. */
const unbreakable =
  "https://positiv.com/documentos/regulamento-interno-versao-definitiva-revisada"

/**
 * Every input kind, each one carrying the longest content it could plausibly
 * be given: alternatives the length of the ones in the rules quiz, a word that
 * cannot be broken, and prompts that have to wrap. A screen that survives this
 * on a 320px phone survives the real forms.
 */
const stressQuestions: Question[] = [
  {
    id: "apresentacao",
    prompt:
      "Como você prefere ser apresentade para quem ainda não te conhece na festa?",
    help: `Campo de texto comum. O endereço ${unbreakable} está aqui de propósito: é uma palavra que o navegador não tem onde quebrar.`,
    input: {
      kind: "text",
      placeholder: "Escreva do jeito que você quiser ser apresentade",
    },
    schema: zod.string().min(2, { message: "Escreva ao menos duas letras" }),
  },
  {
    id: "contato",
    prompt: "Qual e-mail a organização usa para falar com você?",
    input: {
      kind: "email",
      placeholder: "primeiro.nome.sobrenome@servidor-de-email.com.br",
    },
    schema: zod.string().email({ message: "E-mail inválido" }),
  },
  {
    id: "segredo",
    prompt: "Escolha uma senha para acompanhar sua candidatura",
    help: "Campo de senha: o gerenciador de senhas do telefone abre por cima dele.",
    input: {
      kind: "password",
      autoComplete: "new-password",
      placeholder: "Ao menos oito caracteres, sem repetir a de outro site",
    },
    schema: zod.string().min(8, { message: "Use ao menos oito caracteres" }),
  },
  {
    id: "idade",
    prompt: "Quantos anos você tem?",
    help: "Campo numérico. As setinhas ficam escondidas, e o teclado do telefone abre em números.",
    input: { kind: "textnumber", placeholder: "18" },
    schema: zod
      .string()
      .min(1, { message: "Escreva sua idade" })
      .refine((value) => Number(value) >= 18, {
        message: "A festa é para maiores de 18",
      }),
  },
  {
    id: "nascimento",
    prompt: "Em que dia você nasceu?",
    help: "Campo de data: é o controle mais largo que o runtime desenha, e no telefone ele abre o seletor nativo.",
    input: { kind: "date" },
    schema: zod.string().min(1, { message: "Escolha uma data" }),
  },
  {
    id: "bairro",
    prompt: "De que região da cidade você vem?",
    input: {
      kind: "select",
      options: [
        {
          label:
            "Zona leste, saindo de perto da estação mais distante da linha vermelha",
          value: "leste",
        },
        {
          label:
            "Zona sul, entre o metrô e o terminal de ônibus que atende a região inteira",
          value: "sul",
        },
        { label: unbreakable, value: "link" },
      ],
    },
    schema: zod.string().min(1, { message: "Escolha uma região" }),
  },
  {
    id: "cuidado",
    prompt: "Alguém derrubou uma taça no meio da pista. O que acontece agora?",
    help: "Alternativas do tamanho das do quiz de regras, que passam dos duzentos caracteres.",
    input: {
      kind: "radio",
      options: [
        {
          label:
            "Quem derrubou avisa a organização e ajuda a recolher os cacos, porque cuidar do espaço é responsabilidade de cada pessoa que passa por ele e não de uma equipe que aparece depois que todo mundo já foi embora",
          value: "certa",
        },
        {
          label:
            "A pessoa segue dançando e deixa para lá, já que existe alguém contratado para limpar o salão no fim da noite e ninguém vai reparar em alguns cacos de vidro no meio do escuro",
          value: "errada",
        },
        { label: unbreakable, value: "link" },
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
    id: "acordos",
    prompt: "Com quais acordos da festa você se compromete?",
    input: {
      kind: "checkbox",
      options: [
        {
          label:
            "Pedir consentimento antes de qualquer aproximação, e entender que um sim para uma coisa não é um sim para todas as outras que vierem depois dela",
          value: "consentimento",
        },
        {
          label:
            "Não falar fora da festa sobre quem estava lá nem sobre o que aconteceu, porque a privacidade de cada participante depende do silêncio de todas as outras",
          value: "privacidade",
        },
        { label: unbreakable, value: "link" },
      ],
    },
    schema: zod
      .array(zod.string())
      .refine((chosen) => chosen.length >= 2, {
        message: "Marque ao menos os dois primeiros",
      }),
  },
  {
    id: "relato",
    prompt: "Tem alguma coisa que a organização precise saber com antecedência?",
    input: {
      kind: "textarea",
      placeholder:
        "Restrições alimentares, acessibilidade, qualquer coisa que ajude a receber você bem",
    },
    schema: zod.string().optional(),
  },
  {
    id: "aceite",
    prompt:
      "Li as regras inteiras, entendi que uma candidatura não garante uma vaga e concordo com tudo que está escrito acima",
    help: "Caixa única: o texto ao lado dela é o próprio enunciado, então ele é o único que precisa quebrar em várias linhas.",
    input: { kind: "boolean" },
    schema: zod.boolean().refine((ticked) => ticked === true, {
      message: "É preciso concordar para seguir",
    }),
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

const stressIds = stressQuestions.map((question) => question.id)

/** Every input kind, one per screen, in the order the array declares them. */
const stressSteppedFlow: Flow = {
  start: stressIds[0],
  steps: {
    ...Object.fromEntries(
      stressIds.map((id) => [id, { kind: "question" as const, id }]),
    ),
    salvar: commitStep,
  },
  next: (current) => {
    const at = stressIds.indexOf(current)
    if (at === -1) return "done"
    return stressIds[at + 1] ?? "salvar"
  },
}

/** Every input kind stacked on one screen, which is the worst case for height. */
const stressSingleScreenFlow: Flow = {
  start: "tudo",
  steps: {
    tudo: { kind: "screen", ids: stressIds },
    salvar: commitStep,
  },
  next: (current) => (current === "tudo" ? "salvar" : "done"),
}

type Shape = "stepped" | "single" | "stress-stepped" | "stress-single"

const shapes: Record<
  Shape,
  { label: string; questions: Question[]; flow: Flow; presentation: Presentation }
> = {
  stepped: {
    label: "Uma por tela, com ramificação",
    questions,
    flow: steppedFlow,
    presentation: OneAtATime,
  },
  single: {
    label: "Tela única, linear",
    questions,
    flow: singleScreenFlow,
    presentation: AllAtOnce,
  },
  "stress-stepped": {
    label: "Casos extremos, uma por tela",
    questions: stressQuestions,
    flow: stressSteppedFlow,
    presentation: OneAtATime,
  },
  "stress-single": {
    label: "Casos extremos, tela única",
    questions: stressQuestions,
    flow: stressSingleScreenFlow,
    presentation: AllAtOnce,
  },
}

const shapeIds = Object.keys(shapes) as Shape[]

export default function FormRuntimeDemoPage() {
  const [shape, setShape] = useState<Shape>("stepped")
  const [result, setResult] = useState<Answers | null>(null)
  const [runId, setRunId] = useState(0)

  const storageKey = runtimeStorageKey("demo", shape)

  const restart = (next: Shape) => {
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
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 p-4 sm:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Runtime de formulários</h1>
        <p className="text-muted-foreground">
          Página de desenvolvimento. Exercita validação por pergunta, tela de
          conteúdo, ramificação condicional e um commit que falha e devolve o
          fluxo para a pergunta recusada.
        </p>
        <p className="text-muted-foreground">
          Os botões trocam o <strong>fluxo</strong>, não só a aparência. Quantas
          perguntas dividem uma tela é decisão do fluxo; a apresentação cuida do
          enquadramento.
        </p>
        <p className="text-muted-foreground">
          Os dois formatos de <strong>casos extremos</strong> passam por todos os
          tipos de campo que o runtime desenha, com alternativas do tamanho das
          do quiz de regras e uma palavra que não tem onde quebrar. É por ali que
          se confere o comportamento em telas estreitas.
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
          <Button
            type="button"
            variant="outline"
            className="h-auto whitespace-normal py-2"
            onClick={forget}
          >
            Apagar o registro deste formato
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {shapeIds.map((id) => (
          <Button
            key={id}
            type="button"
            variant={shape === id ? "default" : "outline"}
            className="h-auto whitespace-normal py-2"
            onClick={() => restart(id)}
          >
            {shapes[id].label}
          </Button>
        ))}
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
          questions={shapes[shape].questions}
          flow={shapes[shape].flow}
          presentation={shapes[shape].presentation}
          persistence={{ formId: "demo", scopeId: shape }}
          onDone={setResult}
        />
      )}
    </main>
  )
}

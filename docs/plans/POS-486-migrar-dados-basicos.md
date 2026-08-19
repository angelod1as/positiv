# POS-486 — Migrar dados básicos para o runtime de formulários

## PRD

Hoje há **duas rotas** ligadas por um redirect:

| rota | campos | forma |
|---|---|---|
| `/conta/dados-basicos` | `full_name`, `social_name`, `date_of_birth`, `where_lives`, `how_came_to_us`, `phone`, `confirm_phone`, `cpf`, `rg`, `rg_issuer` | `SchemaForm` (remix-forms) + grid de 12 colunas |
| `/conta/dados-basicos-cont` | `gender`, `orientation`, `pronouns`, `race_color` | react-hook-form + `CheckboxWithOther` |

São **14 campos**, não 10 (o ticket conta errado).

Vira **uma rota só** (`/conta/dados-basicos`), **uma tela só** (`AllAtOnce`), sobre o
runtime de formulários (`Question[]` + `Flow` + `FormRunner`). A rota
`/conta/dados-basicos-cont` é removida.

### Decisões tomadas com o usuário

1. **Tela única**, `AllAtOnce`, os 14 campos juntos.
2. Os 4 campos de múltipla escolha viram **chips** (pílulas clicáveis), não
   listas de checkbox — é o que faz 14 campos caberem numa tela só.
   Combobox com busca foi descartado: as listas têm 4–7 opções e buscar em 7
   opções não paga um `cmdk` novo no bundle.
3. O valor livre é **tag input**: o que a pessoa escreve vira mais um chip, ao
   lado das opções. Sem pílula "Outros", sem estado de toggle.
4. O controle é um **componente reutilizável e configurável** (`ChipSelect`), e o
   runtime ganha um kind que só o embrulha.
5. `/conta/dados-basicos-cont` é **removida** (rota, path e arquivo).
6. POS-509 (botão de voltar) está sendo feito em paralelo por outro agente —
   este PR não implementa voltar e não deve mexer no mesmo terreno.

### O que o runtime não tem hoje e precisa ganhar

| falta | por quê | onde |
|---|---|---|
| valores iniciais | `useFormRuntime` começa com `answers = {}`; perfil órfão e re-preenchimento precisam semear os 14 campos | `initialAnswers` em `FormRunner` / `useFormRuntime` |
| múltipla escolha com valor livre | `checkbox` não aceita valor fora das `options` | `ChipSelect` + kind `chips` |
| layout em grid | `AllAtOnce` empilha tudo em coluna única; 14 campos empilhados ficam ilegíveis | apresentação `Grid` |

## Arquitetura

### 1. `ChipSelect` — o componente

Mora em `app/components/forms/base/chip-select.tsx` e não sabe que o runtime
existe: recebe valor e devolve valor, como qualquer controle controlado.

```ts
type ChipSelectProps = {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  /** Deixa acrescentar o que não está na lista. Sem isto, não há campo livre. */
  allowOther?: boolean
  /** O convite escrito no campo livre — cada pergunta fala do seu jeito. */
  otherPlaceholder?: string
  id?: string
  labelledBy?: string
  className?: string
}
```

**O array é a verdade inteira.** Não existe estado de "Outros ligado": valor que
está em `options` desenha a pílula ligada, valor que não está desenha um chip
removível depois das opções.

```ts
const known = new Set(options.map((option) => option.value))
const custom = value.filter((item) => !known.has(item))
```

Desenho:

```
Gênero
[Homem cis] [Homem trans] [Mulher cis ✓] [Travesti] …
[Bigênere ×] [Neutrois ×]            ← valores livres, também chips
┌──────────────────────────────────────────┐
│ Outro? Escreva e aperte Enter            │
└──────────────────────────────────────────┘
```

Interação do campo livre:

- `Enter`, vírgula ou sair do campo confirmam o texto e limpam o input
- `Enter` precisa de `preventDefault`: num input dentro de um `<form>` ele
  submeteria o formulário inteiro em vez de fechar o chip
- texto vazio ou só espaço não vira chip
- duplicata (de opção ou de chip que já existe) é ignorada, sem erro
- `Backspace` no input vazio remove o último chip livre
- `×` remove aquele chip

Confirmar ao sair do campo é o que salva quem escreveu e clicou direto em
Continuar: o `blur` chega no mousedown e o submit no mouseup, então o chip entra
antes de a resposta ser lida.

Acessibilidade: `role="group"` com `aria-labelledby` apontando para o prompt que
a apresentação desenhou; cada opção é `<button type="button" aria-pressed>`
(`type` explícito, senão submete o formulário em volta); cada `×` é um botão com
nome acessível `Remover <valor>`; um `aria-live="polite"` anuncia o que entrou e
o que saiu, porque a mudança acontece longe do foco.

Copy nova em `app/copy/forms.ts`:

```ts
export const chipSelectCopy = {
  otherPlaceholder: "Outro? Escreva e aperte Enter",
  remove: (value: string) => `Remover ${value}`,
  added: (value: string) => `${value} adicionado`,
  removed: (value: string) => `${value} removido`,
} as const
```

Os quatro campos usam o placeholder padrão. `otherPlaceholder` existe para quem
precisar de outra voz depois; nesta tela ninguém sobrescreve.

Não há linha de dica sobre a vírgula. Hoje ela é obrigatória para separar mais de
um valor, e por isso `checkboxWithOtherCopy` precisa dizer "Separe múltiplos por
vírgula". Aqui o caminho anunciado é o `Enter`, e a vírgula fica só como perdão —
para quem tem o hábito antigo e para texto colado. Perdão não se ensina, e são
quatro campos numa tela que já tem catorze.

`checkboxWithOtherCopy` sai junto com o componente que a usava.

### 2. Kind `chips`

O runtime só embrulha o componente:

```ts
| {
    kind: "chips"
    options: Option[]
    allowOther?: boolean
    otherPlaceholder?: string
  }
```

Valor: `string[]` — exatamente a forma que o banco já guarda (`profiles.gender`
e as outras três são `text[]`).

Duas coisas boas caem de graça:

1. **Prefill.** Perfil com `["Mulher cis", "Bigênere"]` desenha uma pílula ligada
   e um chip, sem reabrir input nem re-juntar valores por vírgula — que é onde o
   `CheckboxWithOther` de hoje tem um `useEffect` dentro do render com `[]` de
   dependência.
2. **Some o placeholder `"other"`.** Hoje marcar "Outros" grava a string literal
   `"other"` no array e a página filtra antes de submeter; se o filtro falhar,
   `"other"` vai para o banco. Aqui não existe estado intermediário para
   representar, então não há o que filtrar.

### 3. Apresentação `Grid`

`AllAtOnce` fica como está (é o que a página de cadastro usa). Ao lado dela:

```ts
export type GridSpan = 3 | 4 | 5 | 6 | 12

export type GridSlot =
  | { kind: "question"; id: string; span?: GridSpan }
  | { kind: "note"; id: string; render: ReactNode; span?: GridSpan }

export function gridPresentation(slots: GridSlot[]): Presentation
```

A página monta a lista de slots (memoizada — trocar a identidade da apresentação
remonta o formulário) e o `Grid` desenha na ordem dos slots, dentro de
`flex flex-col gap-6 sm:grid grid-cols-12 sm:gap-4`, que é a classe que o form
de hoje usa. Pergunta do step que não esteja na lista de slots cai no fim em
largura cheia, para que um campo novo nunca desapareça da tela.

Os spans entram por um mapa estático de classes (`col-span-*` interpolado o
scanner do Tailwind não vê).

Nota (`kind: "note"`) é como o `documentsNotice` volta ao meio do grid, entre
`confirm_phone` e `cpf`, e o `raceNotice` ao fim — hoje são parágrafos soltos no
JSX.

Layout desta tela:

```
full_name(5)      social_name(4)   date_of_birth(3)
where_lives(6)    how_came_to_us(6)
phone(6)          confirm_phone(6)
── nota: documentos ────────────────────── (12)
cpf(4)            rg(4)            rg_issuer(4)
gender(6)         orientation(6)      ← chips
pronouns(6)       race_color(6)       ← chips
── nota: cor/raça não é critério ───────── (12)
```

Para não repetir as regras de rótulo (`ownsItsPrompt`, prompt via `<Label for>`
ou via `aria-labelledby` quando o controle é um grupo), o miolo por pergunta de
`AllAtOnce` sai para um `QuestionField` compartilhado pelas duas apresentações.
`chips` entra na lista de kinds que são grupo, junto de `radio` e `checkbox`.

### 4. Valores iniciais

`FormRunner` ganha `initialAnswers?: Answers`, repassado a `useFormRuntime`, que
semeia o `useState` de `answers`. Restauração de `sessionStorage`, quando houver
`persistence`, continua ganhando de qualquer semente.

Esta página **não usa `persistence`**: os 14 campos incluem CPF e RG, e
persistência grava em `sessionStorage`. Mesmo motivo pelo qual a página de
cadastro não persiste as senhas.

### 5. Gravação

`POST /api/account/basic-data`, uma rota de API própria — POST em rota de página
volta como HTML e o `CommitResult` não sobrevive à viagem (é a razão que
`api/auth/register.ts` já documenta).

O endpoint:

1. valida com `basicDataSchema` **e** `ExtraBasicDataSchema` (de novo, no
   servidor — é o que impede um POST cru de gravar qualquer coisa);
2. adota o perfil órfão se houver, faz o upsert dos 10 campos, grava os 4
   extras e `basic_data_filled: true`;
3. reinscreve na newsletter quando houver consentimento (efeito que hoje mora em
   `extraBasicData`);
4. responde `CommitResult` — erro de campo com o `questionId` certo, para o
   runtime desenhar a mensagem embaixo da pergunta.

Para onde ir depois é decisão da página, não do endpoint: `is_admin` e
`basic_data_filled` já vêm do loader, então `onDone` navega para
`ADMIN_DASHBOARD`, `ACCOUNT_READY` (primeiro preenchimento) ou `DASHBOARD`, e o
toast de sucesso sai pelo `sonner`, que o resto do app já usa no cliente.

`basicDataSchema` é `ZodEffects` (dois `.refine`) e não expõe `.shape`. Sai um
`basicDataFieldsSchema` (o objeto) e `basicDataSchema` passa a ser ele com os
refines — o mesmo par que `registerUserFieldsSchema` / `registerUserSchema` já
faz. Os dois refines viram `refine` de pergunta: `confirm_phone` compara com
`phone`, `social_name` compara com `full_name`.

### 6. O que sai

- `app/pages/account/basic-data/gender-pronouns-orientation-page.tsx`
- rota `/dados-basicos-cont` em `app/routes.ts` e `GENDER_PRONOUNS_ORIENTATION`
  em `app/lib/paths.ts`
- `app/components/forms/base/checkbox-with-other.tsx` e `checkboxWithOtherCopy`
- os `action`s das duas páginas; `basicData` e `extraBasicData` são
  reescritos como a função de servidor que o endpoint chama

O `SchemaForm` sai desta página, que é um pedaço a menos para POS-490.

## Passos (TDD, red-green-refactor)

Cada passo é um commit. Teste primeiro, sempre.

### Componente

1. **`ChipSelect` — escolher.** Teste: uma pílula por opção; clicar liga e
   desliga; `aria-pressed` acompanha; `onChange` recebe `string[]`.
2. **`ChipSelect` — valor livre.** Teste: `Enter` vira chip e não submete o
   formulário em volta; vírgula também vira chip; sair do campo também; espaço
   em branco não; duplicata é ignorada; `Backspace` no campo vazio remove o
   último chip; `×` remove aquele chip; valor livre que chega de fora já aparece
   como chip.
3. **`ChipSelect` — configuração e a11y.** Teste: sem `allowOther` não existe
   campo livre; `otherPlaceholder` sobrescreve o padrão; o grupo é rotulado por
   `labelledBy`; o botão de remover se chama "Remover X"; o `aria-live` anuncia
   entrada e saída.

### Runtime

4. **Kind `chips`.** Teste em `render-question.test.tsx`: o case desenha o
   `ChipSelect`, repassa `allowOther` e `otherPlaceholder`, e propaga a mudança.
5. **`chips` é grupo.** Teste: o prompt de um `chips` chega ao controle por
   `aria-labelledby`, não por `for`. Verde: incluir `chips` no `isChoice`.
6. **`QuestionField` extraído.** Refactor puro: `AllAtOnce` passa a usá-lo e os
   testes existentes seguem verdes sem mudança.
7. **`gridPresentation` — spans.** Teste: slot com `span: 4` recebe
   `sm:col-span-4`; pergunta do step ausente dos slots aparece mesmo assim.
8. **`gridPresentation` — notas.** Teste: um slot `note` desenha o nó na posição
   pedida.
9. **`initialAnswers`.** Teste em `use-form-runtime.test.ts`: as sementes
   aparecem em `answers`; e em `form-runner-persistence.test.tsx`: o que estava
   no `sessionStorage` ganha das sementes.

### Domínio

10. **`basicDataFieldsSchema`.** Teste em `common.test.ts`: o objeto valida campo
    a campo e `basicDataSchema` continua reprovando telefone divergente e nome
    social igual ao completo. (Os testes que já existem são a rede.)
11. **`buildBasicDataQuestions`.** Teste novo em
    `app/components/forms/custom/basic-data/`: 14 perguntas, ids batendo com as
    colunas, `chips` com `allowOther` nos quatro — cor/raça inclusive, que hoje
    também aceita valor livre —, `refine` de `confirm_phone` reprovando telefone
    diferente e o de `social_name` reprovando nome social igual ao completo.
12. **`buildBasicDataFlow`.** Teste: um step `screen` com os 14 ids, depois
    `commit`, depois `done`.
13. **`buildBasicDataLayout`.** Teste: a ordem e os spans que a tela pede, com as
    duas notas nas posições certas.
14. **`saveBasicData` (servidor).** Teste de integração: perfil órfão com o
    e-mail da pessoa é adotado (mesmo `id`, `user_id` preenchido);
    `basic_data_filled` vira `true`; inscrição na newsletter é refeita quando há
    consentimento.
15. **Endpoint `POST /api/account/basic-data`.** Teste como o de
    `api/auth/register.ts`: corpo ilegível → 400; schema reprovado → 422 com
    `questionId` por campo; sucesso → `{ ok: true }`.

### Página

16. **Loader.** O teste que já existe (`basic-data-page.test.tsx`) continua
    valendo: perfil órfão encontrado volta no loader, erro que não seja
    `PGRST116` é logado e não derruba. Só cresce com os campos que a tela agora
    precisa (`is_admin`, `basic_data_filled`).
17. **Introduções condicionais.** Teste: com perfil órfão sai `intro.orphan`;
    com `basic_data_filled` sai `intro.update`; senão `intro.initial`.
18. **Prefill.** Teste: os dados do perfil órfão chegam aos campos; sem órfão, os
    do perfil atual; valor de gênero fora da lista aparece como chip.
19. **Destino depois de salvar.** Teste: admin → `ADMIN_DASHBOARD`; primeiro
    preenchimento → `ACCOUNT_READY`; atualização → `DASHBOARD`.
20. **Remoção da rota antiga.** Rota, path, página e `CheckboxWithOther` saem;
    `basic-data.server.ts` para de apontar para `GENDER_PRONOUNS_ORIENTATION`.

### E2E

Escrito e rodado **por último, de uma vez só**: `pnpm test:e2e` toma um lock que
vale para todos os worktrees, e há outros agentes trabalhando.

21. **`e2e/fixtures/auth.ts`** preenche uma tela só; os quatro grupos viram
    cliques em pílulas.
22. **`e2e/pages/SettingsPage.ts`**, `user-settings.spec.ts`,
    `user-access-control.spec.ts` (a lista de caminhos válidos perde
    `/conta/dados-basicos-cont`) e `newsletter-subscription.spec.ts`.

### Fechamento

23. **News dialog**: um item novo em `news-dialog/items/`, em português, sobre a
    tela de dados básicos ter virado uma só.
24. `pnpm lint`, `pnpm test`, `pnpm test:e2e` — os três verdes.
25. Apagar este plano antes de abrir o PR.

## Plano de commits

```
feat(forms): add a chip select control
feat(forms): let a chip select take free-text values
feat(forms): add a chips input kind to the form runtime
feat(forms): lay a screen out on a grid
feat(forms): seed a run with initial answers
refactor(common): split the basic data field schema from its refinements
feat(account): describe basic data as runtime questions
feat(account): save basic data through a commit endpoint
feat(account): run basic data as a single-screen form
refactor(account): drop the second basic data route
test(e2e): fill basic data on one screen
docs(news): announce the single basic data screen
```

## Riscos

- **Perfil órfão** é o comportamento mais fácil de perder na migração: hoje ele
  aparece em dois lugares (o loader da página e de novo dentro de `basicData`).
  O passo 14 é o que amarra isso, e o teste de integração é obrigatório.
- **`date_of_birth`** passa por `zod.coerce.date` — a resposta vira `Date`, e o
  `dateToString` na gravação continua sendo o que salva a coluna.
- **POS-509 em paralelo**: outro agente mexe no runtime ao mesmo tempo. Os
  arquivos com mais chance de conflito são `use-form-runtime.ts` e
  `form-runner.tsx` (passo 9). Manter esse commit pequeno e isolado.
- **Chips mudam o e2e** desses quatro campos: `getByRole("checkbox")` vira
  `getByRole("button", { pressed })`, e o valor livre passa a ser digitar +
  `Enter` em vez de preencher `outros-<campo>`.
- **Teclado mole no celular** manda "Ir" em vez de `Enter`; vírgula e blur
  confirmando o texto são o que cobre isso, e o passo 2 testa os três.
- **Valor livre com vírgula dentro** deixa de ser possível de escrever, porque a
  vírgula confirma. Nenhum dos quatro campos tem opção com vírgula, e o campo
  atual já separa por vírgula, então nada que exista hoje se perde.

# Site copy

Every user-visible string on the site lives here. Editing text means editing one
file in this folder — never a component.

## Editing an existing string

1. Find the module for the area you are changing — `homepage.ts`, `events.ts`,
   `auth.ts`, and so on. The layout mirrors the site's routes.
2. Change the text between the quotes or backticks.
3. That is the whole change. No component needs touching.

Not a developer? You can do this straight from GitHub, no setup. Open the file on
github.com, press the pencil icon, change the text, and press "Propose changes".
That opens a pull request for review. The edit URL follows the pattern
`github.com/OWNER/REPOSITORY/edit/main/app/copy/FILENAME.ts`.

## Adding a NEW string

Say you are adding a "Sair" button to the header.

**1. Add the key to the right module.** Group it under the area it belongs to:

```ts
// app/copy/shared.ts
export const sharedCopy = {
  actions: {
    save: "Salvar",
    cancel: "Cancelar",
    logout: "Sair", // <- new
  },
} as const
```

**2. Use it in the component:**

```tsx
import { sharedCopy } from "~/copy/shared"

export const LogoutButton = () => (
  <Button>{sharedCopy.actions.logout}</Button>
)
```

That is it. Because the module ends in `as const`, TypeScript knows every key:
`sharedCopy.actions.logou` is a compile error, caught by `pnpm lint`.

**When the string has a value in it**, make it a function instead of a string.
Never build the sentence by concatenating in the component:

```ts
// app/copy/dashboard.ts
export const dashboardCopy = {
  greeting: (name: string) => `Olá, ${name}!`,
  eventCount: (count: number) =>
    count === 1 ? "1 evento" : `${count} eventos`,
} as const
```

```tsx
<h1>{dashboardCopy.greeting(user.firstName)}</h1>
<p>{dashboardCopy.eventCount(events.length)}</p>
```

Plurals are a plain `count === 1` branch. The site has one language, so there is
nothing more to it.

## Adding a string WITH FORMATTING (Markdown)

Copy is never JSX. Bold, italics, lists, and links are written as **Markdown**
inside the string, and rendered with the `Copy` component.

**1. Write the Markdown in the copy module.** Use a backtick template literal so
the text can span lines:

```ts
// app/copy/homepage.ts
export const homepageCopy = {
  about: {
    title: "Como assim?",
    body: `Nossos eventos são tipo um **piquenique** entre amigues.

A diferença? Você pode ficar _pelade_ na boa. As regras:

- Ninguém é obrigade a nada;
- Apenas sim é sim.

Dúvidas? [Fale com a gente](/contato).`,
  },
} as const
```

**2. Render it through `Copy`:**

```tsx
import { Copy } from "~/components/atoms/copy/copy"
import { homepageCopy } from "~/copy/homepage"

export const About = () => (
  <section>
    <h2>{homepageCopy.about.title}</h2>
    <Copy>{homepageCopy.about.body}</Copy>
  </section>
)
```

### The Markdown you can use

| You write | You get |
|---|---|
| `**negrito**` | bold |
| `_itálico_` | italic |
| `- item` on its own line | a bullet list |
| `1. item` on its own line | a numbered list |
| `[texto](/rota)` | a link |
| `#### Subtítulo` | a sub-heading |
| a blank line | a new paragraph |

Links starting with `/` stay inside the site and navigate without a page reload.
Any other link (an `https://` address) opens in a new tab.

**Not** supported, because we do not load the extra Markdown plugins: raw HTML
tags, tables, strikethrough, and bare URLs written without brackets. Those show
up as literal characters on the page. Write a link as `[texto](url)` and it works.

### `inline` mode

By default `Copy` wraps text in a paragraph. When the text sits somewhere that
already has its own element — a button, a table cell, a heading — pass `inline`
so no paragraph is added:

```tsx
<Button>
  <Copy inline>{confirmCopy.cancelEvent}</Copy>
</Button>
```

**`inline` only removes the paragraph.** A list or a `####` heading inside an
inline string still renders as a real list or heading, which is invalid markup
inside a button or a label. Treat inline strings as single-paragraph text: bold,
italic, and links are fine; lists and headings are not.

### Strings that must NOT contain Markdown

Some places take a plain string, not elements. Markdown there renders as literal
asterisks:

- `placeholder`
- `alt`
- `aria-label`
- the `title` HTML attribute

Write those as plain text. TypeScript cannot catch this one — just keep them
plain.

## Long prose pages

Pages that are mostly text — the rules, the code of conduct, the terms — follow
the same pattern. They are an array of sections, each a heading plus a Markdown
body:

```ts
export const rulesCopy = {
  title: "Regras e filosofias",
  sections: [
    {
      heading: "🚨 Nenhuma pessoa é obrigada a nada 🚨",
      body: `“Você não é todo mundo”, já dizia minha mãe.

Se você não quiser tomar parte em alguma coisa, **simplesmente não o faça**.`,
    },
  ],
}
```

The component maps over `sections`. Adding a section means adding an entry here
and nothing else.

Note this example has no `as const`. A list that gets iterated does not need one —
there are no keys to protect. Give the array an explicit type instead, so a
section missing its `body` is still a compile error:

```ts
type RulesSection = {
  heading: string
  body: string
}

const sections: RulesSection[] = [ /* ... */ ]
```

## Rules

- Every file in this folder is `.ts`. If you need `.tsx`, you are putting JSX in
  copy — put it in the component instead and pass copy into it.
- End every **keyed** copy object with `as const`. That is what gives the compile
  error on a typo'd key. Do not add a `satisfies` clause inside one — `as const`
  only applies to a plain literal and will stop compiling. Arrays that get
  iterated take an explicit type instead, as shown above.
- No `index.ts` barrel file. Import from the module directly.
- Some Portuguese strings are **not** copy and must not move here: the values in
  `app/lib/constants/constants.ts` (`GENDERS`, `ORIENTATIONS`, `PRONOUNS`,
  `RACE_COLOR`) are stored in the database, and the news dialog in
  `app/components/organisms/news-dialog/news.tsx` has its own workflow.

## The lint rule

`react/jsx-no-literals` is enabled in `eslint.config.js` for the directories that
have been migrated. It fails `pnpm lint` if raw text appears between JSX tags
there. When you finish migrating a directory, add its glob to that rule's `files`
list.

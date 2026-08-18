# Site copy

Every user-visible string on the site lives here. Editing text means editing one
file in this folder — never a component.

## Editing an existing string

1. Find the module for the area you are changing — `homepage.ts`, `events.ts`,
   `auth.ts`, and so on. The layout mirrors the site's routes.
2. Change the text between the quotes or backticks.
3. That is the whole change. No component needs touching.

### Not a developer?

You can do all of this on github.com, with no setup at all.

1. **Find the file.** Use the search box at the top of the repository page and
   paste a few words of the sentence exactly as they appear on the site.
2. **Open the file and press the pencil icon** to edit it in the browser.
3. **Change the text** between the quotes or backticks, and leave everything
   else alone.
4. **Press "Commit changes…"**, make sure *"Create a new branch and start a pull
   request"* is selected, then press **"Propose changes"**.

Someone on the team reviews and merges it, and the change goes live on the next
deploy. Nothing you do here can break the site — until your change is merged,
the site does not change at all.

The edit URL follows the pattern
`github.com/angelod1as/positiv/edit/main/app/copy/FILENAME.ts`.

Everything below is for developers.

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

That is it. TypeScript checks the object's shape, so `sharedCopy.actions.logou`
is a compile error, caught by `pnpm lint`.

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

A string can take a value and Markdown at once — it is still just a function
returning a string, rendered the same way through `Copy`:

```ts
greeting: (name: string) => `Olá, **${name}**!`,
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

### Two traps to know about

**Indentation turns a paragraph into a code block.** These strings usually sit
several levels deep in a nested object, so flush-left text looks like a
mistake — it is not. Keep every continuation line flush left at column 0,
however deep the string sits:

```ts
body: `A diferença? Você pode ficar **pelade** na boa.
    Isso vira um bloco de código.`,
```

That indented second line renders as `<pre><code>Isso vira um bloco de
código.</code></pre>`, asterisks and all, instead of plain text. Nothing in
`pnpm lint` catches this — Prettier does not reformat inside a template
literal, and `jsx-no-literals` cannot see inside a string.

**A line can accidentally look like a list or heading.** A line that begins
with `1. `, `- `, or `#` is Markdown syntax even when that was not the intent
— `"1. lugar: Casa X"` silently becomes an ordered list. (Bare URLs,
`#hashtag` mid-line, and intraword underscores like `relatorio_final_v2` are
safe.)

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

These still live in the copy module like everything else — the only difference is
that the string must be plain text, with no Markdown in it. TypeScript cannot
catch this one, so it is on you to keep them plain.

## Long prose pages

Pages that are mostly text — the rules, the code of conduct, the terms — follow
the same pattern. They are an array of sections, each a heading plus a Markdown
body. Give the array an explicit type, so a section missing its `body` is a
compile error, then wrap it in a keyed object like every other copy module:

```ts
type RulesSection = {
  heading: string
  body: string
}

const sections: readonly RulesSection[] = [
  {
    heading: "🚨 Nenhuma pessoa é obrigada a nada 🚨",
    body: `“Você não é todo mundo”, já dizia minha mãe.

Se você não quiser tomar parte em alguma coisa, **simplesmente não o faça**.`,
  },
]

export const rulesCopy = { title: "Regras e filosofias", sections } as const
```

The component maps over `rulesCopy.sections`. Adding a section means adding an
entry here and nothing else.

## A fixed set paired with something in the component

Sometimes a section is a small, fixed number of items, each of which needs to
pair with something the copy file has no business knowing about — an icon, an
image import. The homepage's "about" cards are the example: three fixed
cards, keyed, each matched to an icon component in `about.tsx`.

Keep the copy a plain keyed object — with `as const satisfies` shape-checking,
as described under Rules below — and iterate it in the component with
`Object.entries`, keying an adjacent lookup object with the same keys:

```tsx
const ICONS: Record<keyof typeof homepageCopy.about.cards, ReactElement> = {
  notAMess: <UsersIcon />,
  affection: <HeartIcon />,
  forWhom: <SparklesIcon />,
}

{Object.entries(homepageCopy.about.cards).map(([key, card]) => (
  <AboutCard key={key} icon={ICONS[key as keyof typeof ICONS]} title={card.title}>
    <Copy>{card.body}</Copy>
  </AboutCard>
))}
```

Type `ICONS` as a `Record` over the copy object's own keys, not as an object
literal TypeScript infers on its own — that way, adding a card without a
matching icon is a compile error, not a runtime crash.

This **iterated keyed object** pattern is different from the array form
above: reach for it when the set is fixed and every entry pairs with
something in the component (an icon, an image). Reach for the array form
instead when the number of items varies (testimonials, events).

## Rules

- Every file in this folder is `.ts`. If you need `.tsx`, you are putting JSX in
  copy — put it in the component instead and pass copy into it.
- Keys are camelCase and name the thing, not the text — `logout`, not
  `sairButton` or `sair`.
- End every **keyed** copy object with `as const`. It makes the object's own
  literal values readonly and keys narrow properly at call sites — but that
  protection stops at a property whose value carries its own explicit type
  annotation, such as an array of sections. `as const` on the parent cannot
  override an explicit type, so an array like that needs its own `readonly`
  modifier (`readonly RulesSection[]`, as shown above) or `.push()` and item
  mutation compile clean. To also enforce a shape — so an entry missing a
  field is a compile error naming that entry — add `satisfies YourType`
  **after** `as const`: `as const satisfies YourType` is valid and keeps the
  literal types. The reverse order, `satisfies YourType as const`, does not
  compile. Arrays that get iterated take an explicit type instead, as shown
  above — make it a `readonly` array type to keep the same protection.
- No `index.ts` barrel file. Import from the module directly.
- A string used in more than one area goes in `shared.ts`. A string used in one
  area stays in that area's module, even if it looks generic — move it to
  `shared.ts` when the second use actually appears, not in anticipation.
- Some Portuguese strings are **not** copy and must not move here: the values in
  `app/lib/constants/constants.ts` (`GENDERS`, `ORIENTATIONS`, `PRONOUNS`,
  `RACE_COLOR`) are stored in the database, and the news dialog in
  `app/components/organisms/news-dialog/items/` has its own workflow — one file per item.

## The lint rule

Directories that have finished migrating are guarded by `react/jsx-no-literals`,
which fails `pnpm lint` if raw text reappears between JSX tags in one of them.
The guard is a config block in `eslint.config.js` that names those directories
explicitly. When you finish migrating a directory, add its glob to that block's
`files` list.

**The guard only sees text between JSX tags.** It runs with
`ignoreProps: true`, and has to — `className` sits on nearly every element.
A hard-coded string *prop* therefore passes lint silently:
`subtitle="Um subtitulo solto"` is as green as `subtitle={copy.subtitle}`.
So a green guard means no literal text is left, not that the directory is
done. When you migrate one, check the props by eye — `placeholder`, `alt`,
`aria-label`, `title`, and any prop the component renders as text.

The block only exists once the first directory is migrated — ESLint rejects a
config block whose `files` array is empty, so there is nothing to add until then.

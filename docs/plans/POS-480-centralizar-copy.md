# POS-480 — Centralize Site Copy (single-locale i18n) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every user-visible Portuguese string out of components and into typed copy modules under `app/copy/`, in **one uniform shape**: every copy value is a plain string in a `.ts` module, and any string may contain Markdown.

**Architecture:** No i18n library. Copy lives in plain TypeScript modules exporting `as const` objects, which gives compile-time key safety for free — `app/lib/helpers/validation-messages.ts` already does exactly this and the task is generalising it. Rich text is expressed as Markdown inside those strings and rendered by a single `Copy` component wrapping `react-markdown`, which is **already a production dependency** used by `app/components/organisms/warning-banner/warning-banner.tsx`. There are no `.tsx` files under `app/copy/` and no JSX in copy. Copy is split by route/domain, one module per area. Regression protection is a lint rule, not a test.

**Tech Stack:** TypeScript, React 19, React Router 7, Vitest, `react-markdown@10`, `@tailwindcss/typography`, `eslint-plugin-react`. One dependency added and two removed, all already applied (see below).

---

## Already done — dependency changes

These were applied before implementation starts. They are on the branch already; do not repeat them.

- **Removed** `@mdx-js/mdx` and `@mdx-js/react`. Verified dead first: no `.mdx` file anywhere, no MDX plugin in `vite.config.ts`, no import in `app/`, `scripts/`, or `e2e/`.
- **Added** `@tailwindcss/typography@0.5.20` as a devDependency and registered it in `app/app.css:3` with `@plugin "@tailwindcss/typography";`.
- Verified with `pnpm build` — green, and `.prose` rules now appear in the emitted CSS.

⚠️ **Consequence to check in Task 9:** `app/components/organisms/warning-banner/warning-banner.tsx:37` already carries `prose prose-sm prose-red max-w-none`. Those classes were **inert** before the plugin was installed and are **live now**. The warning banner's appearance has already changed on this branch. Task 9 has an explicit step to look at it and decide whether to keep or drop those classes.

---

## Locked Decisions

These answer the ticket's "A definir antes de implementar" section.

| Question | Decision | Reason |
|---|---|---|
| Library vs typed constants | **Typed constants** | An i18n lib keys by string, defeating acceptance criterion 3 (compile error on unknown key). Plural rules and lazy locale bundles are worthless with one locale. |
| Keying strategy | **By route/domain**, mirroring `app/pages` and `app/components/pages` | A copy editor thinks "the homepage about section", not "the AboutCard component". |
| Interpolation | **Functions** that take the value and return the finished sentence | Type-checked arguments, no placeholder-parsing runtime. |
| Pluralisation | **Functions with a `count` branch** | Same as `validationMessages.minLength`. One locale means no CLDR plural categories. |
| Rich text | **Markdown inside the string**, rendered by `Copy` | Zero new dependencies; `react-markdown` already ships. Keeps every copy value a plain string, so there is exactly one pattern. |
| Prose pages (rules, code of conduct, terms) | **Same pattern as everything else** — structured sections of Markdown strings | Explicitly requested: one pattern, no exceptions. |
| Regression protection | **`react/jsx-no-literals` lint rule**, scoped per directory | Lint is the right layer for "no literal in JSX", the repo already gates on `pnpm lint`, and it keeps the test suite free of tests about the migration itself. |
| Scope | **Phased**: shared → public site → auth/account → admin → emails | Public site is the highest editorial value; admin is high volume, low editorial value. |
| CMS (Sanity) | **No** | Runtime fetch, cache invalidation, fallback strings, loss of git review — while breaking compile-time key safety. Revisit only if a non-developer edits copy weekly *after* this lands. |

### Testing policy for this task

Only **one** new test file is created by this plan: `app/components/atoms/copy/copy.test.tsx`, which covers the `Copy` renderer — genuinely new production behaviour.

Everything else is a refactor with no behaviour change, so it gets **no new test files**. Instead:

- Existing component tests that assert literal strings are updated in place to assert against the copy module. They keep testing the same rendered output.
- Correctness of each migration is verified by `pnpm lint` (the guard rule plus `tsc`), the existing unit suite, the E2E suite once at the very end of Task 12, and a per-file fidelity check: render the component before and after, compare the visible text with all whitespace stripped, and compare a census of the rendered tags.

Do not write tests that assert a copy module has a given key, that a directory contains no JSX, or that a string was moved. Those test the migration, not the product.

### Why Markdown and not JSX copy modules

Investigated before deciding:

- `react-markdown@10.1.0` is in `dependencies` and already rendered in production (`warning-banner.tsx:38`). Cost of adopting it for copy: zero packages.
- `@mdx-js/*` were installed but dead, and MDX would force a second file format anyway. Removed.
- `app/app.css` already styles headings and paragraphs globally (`h1`–`h6` and `p`, lines 113–163) plus `ol` and `ol > li` (lines 71–77), so rendered Markdown inherits the site's typography with no extra work. `Copy` therefore does **not** wrap output in `prose` — that would double up on the global rules. The typography plugin is available for full-page prose if a specific page needs it.
- There is **no** global `ul` or `li` rule, and Tailwind preflight strips list markers. Components that wanted a disc spelled out `list-inside list-disc` by hand; `Copy` deliberately does **not**, so a list carries whatever marker its surrounding layout provides.
- One scoped exception: `app/app.css:294` styles `ul > li` inside `.centered-layout`, giving each item a `⇝` pseudo-element bullet (`⤷` when nested). `.centered-layout` wraps `app/pages/events`, `app/pages/public`, `app/pages/account`, and the agree-to-terms page — which is to say every page whose copy currently contains a list. Since that layout supplies its own marker, `Copy` emitting a bare `ul` is what keeps the rendering right; adding `list-disc` on top produced a doubled `• ⇝` marker.

### Not copy — do not touch

These look like Portuguese strings but are **persisted domain values or wire formats**. Moving or editing them corrupts data.

- `app/lib/constants/constants.ts`: `GENDERS`, `ORIENTATIONS`, `PRONOUNS`, `RACE_COLOR` — written to and read from the database.
- `app/lib/helpers/propMaps.ts` — maps database values to labels. The *label* side is copy; the *key* side is data. Only labels move, and only in Task 10.
- `app/components/organisms/news-dialog/news-utils.ts` — already a single editable content array with its own documented workflow in CLAUDE.md. Leave it.

### Copy fidelity changes requiring sign-off

Markdown cannot express three things currently in the JSX. Each is a deliberate, visible change:

1. `rules-text.tsx:17` — the `small` tag around `(Quem falou que suruba é bagunça, né?)` becomes italic: `_(Quem falou que suruba é bagunça, né?)_`. Markdown has no small-text syntax; the alternative is adding `rehype-raw`, a new dependency, for one occurrence.
2. `home-page-founders.tsx:43` — the `i` tag around `organizador de suruba` becomes `_organizador de suruba_`, which renders as an `em` tag. Visually identical.
3. Every `b` tag becomes `**`, which renders as a `strong` tag. `rules-text.tsx` already mixes `b` and `strong` arbitrarily; both render bold, so this is invisible and also fixes the inconsistency.

`social-name-renderer.tsx:41` also uses an `i` tag, but that is a data renderer, not copy — leave it.

### Where Markdown does not apply

- **String-only props.** `placeholder`, `alt`, `aria-label`, and the `title` HTML attribute take strings, not elements. Copy for those must be plain text.
- **Emails.** `app/business/email/templates/*` build HTML strings server-side, not React. Their copy modules hold plain strings and the templates keep their own HTML.

---

## File Structure

```
app/
  components/atoms/copy/
    copy.tsx                 # the Copy renderer (a component, not copy)
    copy.test.tsx            # the only new test file in this plan
  copy/
    README.md                # the convention — written before any migration
    shared.ts                # buttons, generic actions, generic labels
    errors.ts                # error boundary + toast failure messages
    meta.ts                  # page titles and og:description strings
    homepage.ts
    events.ts                # includes the full rules text as sections
    public.ts                # includes the code of conduct as sections
    auth.ts
    account.ts
    dashboard.ts
    newsletter.ts
    admin/
      events.ts
      participants.ts
      dataviz.ts
      tables.ts
    emails/
      application.ts
      event-opening.ts
      registration-limit.ts
```

Rules:

- **Every file under `app/copy/` is `.ts`.** A `.tsx` there means JSX leaked into copy.
- **No barrel exports.** There is no `app/copy/index.ts`. Import directly: `import { homepageCopy } from "~/copy/homepage"`.
- `app/lib/helpers/validation-messages.ts` **stays where it is**. It is already correct, already imported by schemas, and moving it is churn.

---

## Task 1: The `Copy` renderer

This is the whole rendering mechanism. Build it first — every later task depends on it. This is the one place in the plan that adds new behaviour, so it is the one place that gets a new test.

**Files:**

- Create: `app/components/atoms/copy/copy.tsx`
- Test: `app/components/atoms/copy/copy.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/components/atoms/copy/copy.test.tsx`:

```tsx
import { describe, expect, it } from "vitest"
import { renderWithRouter, screen } from "~/test/test-utils"
import { Copy } from "./copy"

describe("Copy", () => {
  it("renders plain text unchanged", () => {
    renderWithRouter(<Copy>Salvar</Copy>)

    expect(screen.getByText("Salvar")).toBeInTheDocument()
  })

  it("renders bold markdown as strong", () => {
    const { container } = renderWithRouter(
      <Copy>Somos **muito** diferentes</Copy>,
    )

    expect(container.querySelector("strong")).toHaveTextContent("muito")
  })

  it("renders italic markdown as em", () => {
    const { container } = renderWithRouter(
      <Copy>_organizador de suruba_</Copy>,
    )

    expect(container.querySelector("em")).toHaveTextContent(
      "organizador de suruba",
    )
  })

  it("renders a blank-line-separated block as separate paragraphs", () => {
    const { container } = renderWithRouter(
      <Copy>{"Primeiro parágrafo.\n\nSegundo parágrafo."}</Copy>,
    )

    expect(container.querySelectorAll("p")).toHaveLength(2)
  })

  it("renders a markdown list with the site's list classes", () => {
    const { container } = renderWithRouter(
      <Copy>{"- Beber água;\n- Seguir as regras;"}</Copy>,
    )

    const list = container.querySelector("ul")
    expect(list.className).toBe("")
    expect(container.querySelectorAll("li")).toHaveLength(2)
  })

  it("renders a sub-heading as h4", () => {
    const { container } = renderWithRouter(
      <Copy>{"#### Claro, há excessões:"}</Copy>,
    )

    expect(container.querySelector("h4")).toHaveTextContent(
      "Claro, há excessões:",
    )
  })

  it("routes an internal link through the client-side router", () => {
    const { container } = renderWithRouter(
      <Copy>{"Dúvidas? [Fale com a gente](/feedback)."}</Copy>,
    )

    const link = container.querySelector("a")
    expect(link).toHaveAttribute("href", "/feedback")
    expect(link).not.toHaveAttribute("target")
  })

  it("opens an external link in a new tab", () => {
    const { container } = renderWithRouter(
      <Copy>{"[Instagram](https://instagram.com/positivparty)"}</Copy>,
    )

    const link = container.querySelector("a")
    expect(link).toHaveAttribute("href", "https://instagram.com/positivparty")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
  })

  it("emits no paragraph wrapper when inline", () => {
    const { container } = renderWithRouter(<Copy inline>Como **assim**?</Copy>)

    expect(container.querySelector("p")).not.toBeInTheDocument()
    expect(container.querySelector("strong")).toHaveTextContent("assim")
  })
})
```

`renderWithRouter` comes from the repo's existing `app/test/test-utils.tsx`; the link cases need a router in context.

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm vitest --run app/components/atoms/copy/copy.test.tsx
```

Expected: FAIL — `Failed to resolve import "./copy"`.

- [ ] **Step 3: Write the implementation**

Create `app/components/atoms/copy/copy.tsx`:

```tsx
import type { ReactNode } from "react"
import Markdown, { type Components } from "react-markdown"
import { Link } from "~/components/atoms/link/link"

const BLOCK_COMPONENTS: Components = {
  a: ({ href, children }) =>
    href?.startsWith("/") ? (
      <Link to={href}>{children}</Link>
    ) : (
      <Link to={href ?? ""} target="_blank" rel="noreferrer">
        {children}
      </Link>
    ),
}

const INLINE_COMPONENTS: Components = {
  ...BLOCK_COMPONENTS,
  p: ({ children }) => <>{children}</>,
}

type CopyProps = {
  children: string
  inline?: boolean
}

export const Copy = ({ children, inline = false }: CopyProps): ReactNode => (
  <Markdown components={inline ? INLINE_COMPONENTS : BLOCK_COMPONENTS}>
    {children}
  </Markdown>
)
```

The `a` override matters: without it `react-markdown` emits a bare anchor, and an
internal link in copy would trigger a **full page reload** instead of client-side
navigation. Both branches go through the `Link` atom because `app/app.css` has no
`a` rule at all — a bare anchor renders with no underline, no colour, and no hover
affordance, which is a WCAG 1.4.1 failure. The external branch differs only by
`target` and `rel`. This matches how `app/components/organisms/footer/footer.tsx`
and `app/pages/public/code-of-conduct.tsx` already handle external URLs.

Do not add `noopener` alongside `noreferrer`. The HTML Standard's *get an
element's noopener* algorithm already returns true for `noreferrer` alone, and
`target="_blank"` has implied `noopener` since Chrome 88 / Firefox 79 /
Safari 12.1.

One detail worth stating: `Copy` deliberately does not wrap its output in a
`prose` container, and does not impose a list style either. The global element
styles in `app/app.css` already cover headings and paragraphs, and inside
`.centered-layout` — which wraps every page whose copy has a list — line 294
supplies the list marker. Adding typography classes or `list-disc` on top would
double up.

- [ ] **Step 4: Run the test and confirm it passes**

```bash
pnpm vitest --run app/components/atoms/copy/copy.test.tsx
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add app/components/atoms/copy/copy.tsx app/components/atoms/copy/copy.test.tsx
git commit -m "feat(copy): add the Copy markdown renderer"
```

---

## Task 2: Write the convention document and the shared module

The document comes **before** any migration, so every later task has one place to follow and the answer to "how do I add a string" exists from day one.

**Files:**

- Create: `app/copy/README.md`
- Create: `app/copy/shared.ts`

- [ ] **Step 1: Write `app/copy/README.md`**

Write this file with exactly the content below. It is a deliverable, not a sketch.

````markdown
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
  `app/components/organisms/news-dialog/news-utils.ts` has its own workflow.

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
````

- [ ] **Step 2: Write `app/copy/shared.ts`**

```ts
export const sharedCopy = {
  actions: {
    save: "Salvar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    back: "Voltar",
    edit: "Editar",
  },
  status: {
    loading: "Carregando...",
  },
} as const
```

Keys are added to this module as duplicates surface during later tasks. Do not
invent keys nothing uses yet.

- [ ] **Step 3: Confirm the project still typechecks**

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/copy/README.md app/copy/shared.ts
git commit -m "docs(copy): document the copy convention and add the shared module"
```

---

## Task 3: Prove the lint guard works

`react/jsx-no-literals` comes from `eslint-plugin-react`, already a devDependency and already configured in block 4 of `eslint.config.js`. It replaces the need for any test about the migration.

The guard block is **not** added to `eslint.config.js` yet: it would have to name at least one directory, and no directory is migrated yet, so lint would fail. A flat-config block with an empty `files` array is not an option either — ESLint rejects it outright (verified). Task 5 adds the block for real, with the homepage glob, once the homepage is clean.

This task only confirms the rule behaves as assumed, using a throwaway config that is never committed.

- [ ] **Step 1: Write a probe config at the repository root**

The file must live inside the repo so it can resolve `eslint-plugin-react`.

```js
// guard.probe.config.js
import pluginReact from "eslint-plugin-react"

export default [
  {
    files: ["**/*.tsx"],
    plugins: { react: pluginReact },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true }],
    },
  },
]
```

- [ ] **Step 2: Run it against the file Task 4 is about to migrate**

```bash
pnpm exec eslint --no-config-lookup -c guard.probe.config.js app/components/pages/homepage/about/about.tsx
```

Expected: a list of errors of exactly this form —

```
11:26  error  Strings not allowed in JSX files: "Como assim?"  react/jsx-no-literals
```

If the rule reports nothing, stop: the guard is not doing its job and the rest of the plan has no safety net.

- [ ] **Step 3: Delete the probe config**

```bash
rm guard.probe.config.js
```

Nothing is committed in this task.

---

## Task 4: Migrate the homepage `about` section (the pilot)

The reference migration. It covers the hardest ordinary case — prose with inline emphasis — so every later task repeats it mechanically. No new test file: the correctness check is lint plus a visual pass.

**Files:**

- Create: `app/copy/homepage.ts`
- Modify: `app/components/pages/homepage/about/about.tsx`

- [ ] **Step 1: Write the copy module**

Create `app/copy/homepage.ts`. Cards are a keyed object, not an array: the keys are stable identifiers the component pairs with icons, so the copy file holds only text. Icons are not copy and stay in the component.

```ts
export const homepageCopy = {
  about: {
    title: "Como assim?",
    cards: {
      notAMess: {
        title: "suruba não é bagunça",
        body: `Nossos eventos são tipo um **piquenique** ou **churras** entre amigues. **Não somos uma balada**.

A diferença? Você pode ficar **pelade** e fazer **sexo** na boa, sem se esconder. É um encontro relax, focado em trocar ideia e estar juntes.`,
      },
      affection: {
        title: "afeto vs putaria",
        body: `Somos muito diferentes de sauna ou casa de swing. Priorizamos **segurança** e **consentimento**.

**Não é sobre putaria, é sobre afeto.**

Incentivamos a **conversa**, a **troca**. Sexo, só com **100% de consentimento** — **ninguém é obrigade a nada**.`,
      },
      forWhom: {
        title: "para quem?",
        body: `Nossos encontros são para pessoas **não-monogâmicas** e **queer**.

Criamos um espaço de **liberdade** e **exploração**, ideal para quem foge do tradicional.

E, claro, nosso evento é para **maiores de 18 anos**.`,
      },
    },
  },
} as const
```

- [ ] **Step 2: Rewrite the component to consume the copy**

Replace the contents of `app/components/pages/homepage/about/about.tsx`:

```tsx
import { HeartIcon, SparklesIcon, UsersIcon } from "lucide-react"
import { Copy } from "~/components/atoms/copy/copy"
import { homepageCopy } from "~/copy/homepage"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"
import { AboutCard } from "./about-card"

const { title, cards } = homepageCopy.about

const ICONS = {
  notAMess: <UsersIcon />,
  affection: <HeartIcon />,
  forWhom: <SparklesIcon />,
}

export const HomePageAbout = () => {
  return (
    <Section hasBg>
      <div className="px-4 md:px-6 flex flex-col items-center">
        <div className="flex flex-col items-center justify-center gap-4 text-center max-w-(--breakpoint-xl)">
          <HomePageTitle>{title}</HomePageTitle>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12 pt-8">
            {Object.entries(cards).map(([key, card]) => (
              <AboutCard
                key={key}
                icon={ICONS[key as keyof typeof ICONS]}
                title={card.title}
              >
                <Copy>{card.body}</Copy>
              </AboutCard>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
```

`AboutCard`'s `title` prop takes a string, so it is passed directly. If a title ever needs emphasis, change `AboutCard` to wrap it in `Copy` with the `inline` prop.

- [ ] **Step 3: Typecheck**

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Verify the rendered output visually**

```bash
pnpm dev
```

Open `http://localhost:5173/` and compare the "Como assim?" section against `git stash`ed original. Paragraph spacing is the most likely thing to shift, because Markdown emits one paragraph per blank-line-separated block where the JSX had explicit paragraph tags. `app/app.css:146` styles paragraphs globally, so they should match. If spacing differs, add the needed class to `BLOCK_COMPONENTS.p` in `copy.tsx` rather than patching this one component.

Another session may already hold port 5173. If `pnpm dev` fails to bind, check with `lsof -i :5173` before assuming the build is broken.

- [ ] **Step 5: Commit**

```bash
git add app/copy/homepage.ts app/components/pages/homepage/about/about.tsx
git commit -m "refactor(homepage): move the about section copy into app/copy"
```

---

## The migration recipe

Every remaining migration repeats these steps per file. Written out once here; later tasks reference "the recipe" plus their own file-specific notes.

1. Add the keys to the copy module. Prose becomes a Markdown template literal. Inline emphasis becomes `**` or `_`. List items become `- ` lines. Values used as `placeholder`, `alt`, `aria-label`, or the `title` attribute stay plain text.
2. Replace the literals in the component. Wrap prose in `Copy`; wrap emphasis-bearing labels in `Copy` with the `inline` prop; pass plain values straight through.
3. If the file has an existing test asserting a literal, update the assertion to reference the copy module. Do not delete it, and do not add a new one.
4. Run `pnpm lint` and confirm it passes.
5. Commit — one commit per file.

---

## Task 5: Migrate the rest of the homepage and enable the guard for it

**Files to migrate, in this order** (smallest first):

- `app/components/pages/homepage/home-title/home-title.tsx` — inspect first; it may be layout-only with no copy.
- `app/components/pages/homepage/hero/hero.tsx`
- `app/components/pages/homepage/cta-banner/home-page-cta-banner.tsx`
- `app/components/pages/homepage/feedback/home-page-feedback.tsx` — **has an existing test** asserting the literals `"Nos deixe um feedback"` and `/Estamos sempre buscando melhorias/`. Update those assertions to reference `homepageCopy.feedback.*`; keep the test.
- `app/components/pages/homepage/next-events/next-events.tsx` — **has an existing test**; same treatment.
- `app/components/pages/homepage/next-events/next-events-skeleton.tsx`
- `app/components/pages/homepage/testimonials/home-page-testimonials.tsx` — testimonial quotes are copy; move the whole set as a keyed object.
- `app/components/pages/homepage/founders/home-page-founders.tsx` — same shape as `about`: a keyed `founders` object holding `name`, `pronouns`, `instagram`, and a Markdown `bio`. The `i` tag around `organizador de suruba` becomes `_organizador de suruba_` (fidelity change 2). Image imports and the YouTube iframe stay in the component; assets and embeds are not copy.

- [ ] **Step 1: Migrate each file above using the recipe**

- [ ] **Step 2: Add the guard block to `eslint.config.js`**

Insert it directly after block 4 (React Specific Configuration), so the base React config stays untouched:

```js
  // 4b. Copy guard: migrated directories must not hold literal JSX text.
  //     Add a glob here when a directory finishes migrating. See app/copy/README.md.
  {
    files: ["app/components/pages/homepage/**/*.tsx"],
    ignores: ["**/*.test.tsx"],
    plugins: { react: pluginReact },
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true }],
    },
  },
```

`noStrings: true` catches both bare text and `{"text in braces"}`. `ignoreProps: true` leaves `className` and friends alone — prop copy is covered by the README, not by this rule. Test files are excluded because they legitimately render literal text to assert on it.

**This is the guard's blind spot, and it applies to every remaining task.** Because props are ignored, a hard-coded string prop lints clean: replacing `subtitle={nextEvents.subtitle}` with `subtitle="Um subtitulo solto"` in `next-events.tsx` exits 0 (verified). A green guard proves no literal text is left between tags — it does **not** prove the directory is fully migrated. Every task from here on must read the string props by eye: `placeholder`, `alt`, `aria-label`, `title`, and any prop a component renders as text.

- [ ] **Step 3: Run lint and the full unit suite**

```bash
pnpm lint && pnpm test:unit
```

Expected: both PASS. Any lint error names a file missed in Step 1 — migrate it and re-run.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js
git commit -m "chore(lint): enable the copy guard for the homepage"
```

---

## Task 6: Convert the rules text to Markdown sections

The largest single migration: 136 accented lines, separators, and two alert blocks. It becomes structured data — one shape, no exceptions — and the component collapses from ~400 lines to roughly 25.

**Files:**

- Create: `app/copy/events.ts`
- Modify: `app/components/pages/events/rules/rules-text.tsx`

- [ ] **Step 1: Write the copy module**

Create `app/copy/events.ts` with the shape below. Every section carries a `heading` (plain text — it renders inside an `h4` element and is used as a React key) and a Markdown `body`; `alert` is present only where the original had an alert block.

Transcribe all ten sections from the current `rules-text.tsx`. Do not retype prose — copy each paragraph across and convert only the markup: `b`/`strong` tags to `**`, list items to `- ` lines, the `small` tag to `_..._` (fidelity change 1). The first two sections are shown in full as the pattern; the remaining eight follow identically.

```ts
type RulesAlert = {
  title: string
  body: string
}

type RulesSection = {
  heading: string
  body: string
  alert?: RulesAlert
}

const sections: RulesSection[] = [
  {
    heading: "🚨 Nenhuma pessoa é obrigada a nada 🚨",
    body: `“Você não é todo mundo”, já dizia minha mãe.

Se, durante toda a nossa experiência, você não quiser tomar parte em alguma coisa, **simplesmente não o faça**.

Se você não quiser conversar durante o evento, não converse. Se não quiser mandar nude no grupo do whatsapp, não mande. Se não quiser andar pelade na festa, não ande. Se não quiser comer os deliciosos quitutes que todo mundo vai levar, o azar é seu, porém, não coma.

Ninguém é obrigade a **nada**.

#### Claro, há excessões:

- Beber água;
- Seguir as regras;
- Responder todas essas questões corretamente.

Se, em qualquer parte do processo, você achar que não quer mais participar, apenas saia, sem ressentimentos (mas veja nossa política de reembolso para não ter nenhum susto).`,
  },
  {
    heading: "🤫 Você não fala sobre quem vai à Positiv 🤫",
    body: `Um de nossos pilares é a **privacidade de nossos participantes**.

Portanto, **não comentamos** sobre pessoas que conhecemos na festa ou no grupo.

Algumas pessoas têm empregos, relações familiares ou imagens públicas que podem ser afetadas negativamente se sua presença nas festas for revelada.

Lembre-se sempre: trate todas as pessoas com respeito e cuidado. Elus estão ali para se divertirem, assim como você, e tem vivências e prioridades que podem ser diferentes das suas.`,
    alert: {
      title: "🤫 Ninguém sabe até todo mundo saber 🤫",
      body: `Nunca falamos quem vai à uma festa antes do grupo do WhatsApp ser criado. Assim, todo mundo fica sabendo — ao mesmo tempo — quem vai ao mesmo evento.

Existem pouquíssimas — mesmo, quase nenhuma — excessões à essa regra.

"Ah, mas como vou saber se meu chefe vai estar na mesma festa que eu?" Do mesmo jeito que todo mundo: entrando no grupo do WhatsApp e lhe vendo lá. Falar para você que elu está na festa é um baita problema de privacidade, não acha?`,
    },
  },
  // Remaining sections, transcribed from rules-text.tsx in the same order:
  // "👍 Apenas SIM é SIM 👍" (with the "👀 Olhar tira pedaço, sim! 👀" alert)
  // "🥡 A Positiv não é marmitaria 🥡"
  // "😷 Proteção e saúde 😷" (with the "🍆 A capa pode escapar... 🍆" alert)
  // "📸 Sem celular e sem fotos 📸"
  // "💪 Experiência intensa 💪"
  // "🗑️ Não deixe rastros 🧼🫧" (two sub-headings: "Limpeza" and "Trouxe? Leve."
  //   — both become "#### " lines inside its body)
  // "🕺 Não somos uma balada 🪩"
]

export const rulesCopy = {
  title: "Regras e filosofias",
  intro: `Antes de se inscrever em nosso evento, precisamos ter certeza que você **leu** e **entendeu** as nossas principais regras e filosofias.

Portanto, criamos esse breve teste! Você só conseguirá se inscrever em nosso evento se todas as respostas estiverem corretas. _(Quem falou que suruba é bagunça, né?)_

Vamos ao que interessa:`,
  sections,
}
```

Two notes on this module:

- The heading of the second section drops its inline `b` tag around "não". Headings are plain text so they can serve as React keys; the emphasis was decorative on an already-bold heading.
- `sections` is annotated `RulesSection[]` rather than `as const`, because sections are iterated, not keyed. Compile-time key safety still applies to `rulesCopy.title`, `rulesCopy.intro`, and every field name inside a section.

- [ ] **Step 2: Rewrite the component**

Replace the contents of `app/components/pages/events/rules/rules-text.tsx`:

```tsx
import { Copy } from "~/components/atoms/copy/copy"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Separator } from "~/components/ui/separator"
import { rulesCopy } from "~/copy/events"

export const RulesText = () => {
  return (
    <>
      <h1>{rulesCopy.title}</h1>
      <Copy>{rulesCopy.intro}</Copy>

      {rulesCopy.sections.map((section) => (
        <div key={section.heading}>
          <Separator />
          <h4>{section.heading}</h4>
          <Copy>{section.body}</Copy>
          {section.alert && (
            <Alert className="flex flex-col gap-4">
              <AlertTitle>{section.alert.title}</AlertTitle>
              <AlertDescription className="flex flex-col gap-4">
                <Copy>{section.alert.body}</Copy>
              </AlertDescription>
            </Alert>
          )}
        </div>
      ))}
    </>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Verify the page visually — the step most likely to surface a problem**

```bash
pnpm dev
```

Navigate to an event's rules page — the route is `/events/EVENT_ID/rules`, using any real event id from the dashboard. Check specifically:

- **Section spacing.** The original had each separator as a sibling of a fragment; the rewrite nests each separator inside a section wrapper. If vertical rhythm changed, render the separator between items instead of before each one and skip it for the first section.
- **List markers.** This page renders inside `.centered-layout` (via `app/pages/events/layout.tsx`), and `app/app.css:294` gives every `ul > li` there a `⇝` pseudo-element bullet. `Copy` emits a bare `ul`, so that pseudo-element is the only marker. Note the pre-migration page also carried `list-inside list-disc`, which stacked a disc on top; that doubled marker is intentionally gone.
- **Alert blocks.** Both must keep their card styling and internal paragraph gaps.
- **Section count.** Ten sections, same order and same headings as before.

- [ ] **Step 5: Commit**

```bash
git add app/copy/events.ts app/components/pages/events/rules/rules-text.tsx
git commit -m "refactor(events): convert the rules text to markdown copy sections"
```

---

## Task 7: Migrate the public site and the remaining events pages

Apply the recipe. New modules: `app/copy/public.ts`, `app/copy/meta.ts`, `app/copy/errors.ts`; extend `app/copy/events.ts` and `app/copy/shared.ts` as duplicates surface.

**Files:**

- `app/pages/public/code-of-conduct.tsx` — same treatment as Task 6: the body becomes `codeOfConductCopy.sections` in `app/copy/public.ts`, and the page keeps only its `loader`, its `meta`, and the section map. Its three meta strings (`"Código de Conduta"` and the two `"Código de conduta da Positiv"` values) move to `app/copy/meta.ts`:

  ```ts
  export const metaCopy = {
    codeOfConduct: {
      title: "Código de Conduta",
      description: "Código de conduta da Positiv",
    },
  } as const
  ```

  The page reads `isLoggedIn` from its loader and renders a conditional block; keep that conditional in the component and give the two branches separate copy keys.

- `app/pages/public/feedback-page.tsx`
- `app/pages/events/application/bdsm-consent/event-bdsm-consent.tsx` — 73 accented lines, mostly prose. Section treatment as in Task 6, into `app/copy/events.ts` as `bdsmConsentCopy`. The consent *logic* stays in the page.
- `app/pages/events/application/rules-dialog.tsx`
- `app/pages/events/application/rules/event-rules-page.tsx` — includes the `Wrapper` strings (`"✅ Hora do teste! ✅"`, `"(As questões e respostas são automaticamente embaralhadas)"`, `"Carregando perguntas..."`, `"Há erros nas suas respostas"`, `"Continuar"`) and the action's `"Houve um erro no sistema, tente novamente mais tarde"`, which belongs in `app/copy/errors.ts`.
- `app/pages/events/application/user-data/event-user-data.tsx`
- `app/components/forms/custom/rules/rules-questions.tsx` — 58 accented lines. Question text and answer options are copy and move to `app/copy/events.ts` keyed by question name; the `correct` arrays and scoring logic stay put. **Read `shuffle-questions.ts` before editing** — the shuffling keys off this structure, so preserve the field names it reads.
- `app/components/forms/custom/rules/rules-form-schema.tsx`
- `app/components/organisms/event-card/event-card-footer.tsx`
- `app/components/organisms/event-list/event-list-skeleton.tsx`

- [ ] **Step 1: Migrate each file with the recipe, one commit per file**

- [ ] **Step 2: Extend the guard globs**

```js
    files: [
      "app/components/pages/homepage/**/*.tsx",
      "app/components/pages/events/**/*.tsx",
      "app/pages/public/**/*.tsx",
      "app/pages/events/**/*.tsx",
    ],
```

- [ ] **Step 3: Run lint and the unit suite**

```bash
pnpm lint && pnpm test:unit
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js
git commit -m "chore(lint): enable the copy guard for the public site"
```

---

## Task 8: Migrate auth, account, dashboard, and newsletter

New modules: `app/copy/auth.ts`, `app/copy/account.ts`, `app/copy/dashboard.ts`, `app/copy/newsletter.ts`; extend `app/copy/errors.ts`.

**Files:**

- `app/pages/auth/login-page.tsx`
- `app/pages/auth/register-page.tsx`
- `app/pages/auth/confirm-email-message-page.tsx`
- `app/pages/auth/confirm.tsx`
- `app/pages/auth/forgot-password-page.tsx`
- `app/pages/auth/registration-error-page.tsx`
- `app/pages/account/account-page.tsx`
- `app/pages/account/change-password-page.tsx`
- `app/pages/account/basic-data/basic-data-page.tsx`
- `app/pages/account/basic-data/gender-pronouns-orientation-page.tsx` — the *labels* here are copy; the `GENDERS` / `ORIENTATIONS` / `PRONOUNS` values it renders come from `constants.ts` and are database values. Do not move those.
- `app/pages/dashboard/dashboard-page.tsx`
- `app/pages/dashboard/download-calendar.route.tsx`
- `app/pages/dashboard/agree-to-terms-page/agree-to-terms-page.tsx` — 44 accented lines of terms prose; section treatment as in Task 6, into `app/copy/dashboard.ts`.
- `app/pages/newsletter/unsubscribe.tsx`
- `app/business/auth/auth.server.ts` — server-side strings returned to the UI are copy; they go to `app/copy/errors.ts`.

- [ ] **Step 1: Migrate each file with the recipe, one commit per file**

- [ ] **Step 2: Extend the guard globs with `app/pages/auth/**/*.tsx`, `app/pages/account/**/*.tsx`, `app/pages/dashboard/**/*.tsx`, `app/pages/newsletter/**/*.tsx`**

- [ ] **Step 3: Run lint and the unit suite, then commit**

```bash
pnpm lint && pnpm test:unit
git add eslint.config.js
git commit -m "chore(lint): enable the copy guard for auth, account, and dashboard"
```

---

## Task 9: Migrate shared components

Cross-cutting and mostly short labels, so most land in `app/copy/shared.ts` and `app/copy/errors.ts`.

- [ ] **Step 1: Resolve the warning banner's now-live `prose` classes**

Before migrating anything else, deal with the side effect of installing the typography plugin.

```bash
pnpm dev
```

Trigger the warning banner and compare it against `main`. `app/components/organisms/warning-banner/warning-banner.tsx:37` carries `prose prose-sm prose-red max-w-none`, which did nothing before and now applies typography styles on top of the global rules in `app/app.css`.

Decide one of two ways and apply it:

- The banner still looks right → keep the classes.
- Typography now fights the global styles → drop `prose prose-sm prose-red max-w-none`, keeping `max-w-none` only if the layout needs it.

Then replace the file's inline `ReactMarkdown` usage with the `Copy` component, so the codebase has exactly one Markdown renderer.

Commit this on its own:

```bash
git add app/components/organisms/warning-banner/warning-banner.tsx
git commit -m "refactor(warning-banner): render through Copy and settle the typography classes"
```

- [ ] **Step 2: Migrate the remaining files with the recipe, one commit per file**

- `app/components/organisms/header/header.tsx`
- `app/components/organisms/footer/footer.tsx`
- `app/components/organisms/news-dialog/news-dialog.tsx` — dialog *chrome* only. `news.tsx` and `news-utils.ts` stay (see "Not copy").
- `app/components/organisms/newsletter-subscription-modal/newsletter-subscription-modal.tsx`
- `app/components/organisms/profile-update-guard/profile-update-config.tsx`
- `app/components/molecules/confirm-dialog/confirm-dialog.tsx`
- `app/components/molecules/approval-status-dropdown/approval-status-dropdown.tsx`
- `app/components/atoms/badges/badges.tsx`
- `app/components/atoms/data-pair/data-pair.tsx`
- `app/components/atoms/buttons/add-to-google-contacts-button.tsx`
- `app/components/atoms/charts/demographic-filter-toggle.tsx`
- `app/components/atoms/floating-whatsapp-button/floating-whatsapp-button.tsx`
- `app/components/forms/base/checkbox-with-other.tsx`
- `app/components/forms/runtime/use-form-runtime.ts`
- `app/root.tsx` — error boundary strings go to `app/copy/errors.ts`.

- [ ] **Step 3: Extend the guard globs with `app/components/atoms/**/*.tsx`, `app/components/molecules/**/*.tsx`, `app/components/organisms/**/*.tsx`, `app/components/forms/**/*.tsx`**

The block's existing `ignores: ["**/*.test.tsx"]` already covers `copy.test.tsx`, which renders literal Markdown on purpose.

- [ ] **Step 4: Run lint and the unit suite, then commit**

```bash
pnpm lint && pnpm test:unit
git add eslint.config.js
git commit -m "chore(lint): enable the copy guard for shared components"
```

---

## Task 10: Migrate the admin area

Highest file count, lowest editorial value — last among the UI phases. New modules: `app/copy/admin/events.ts`, `app/copy/admin/participants.ts`, `app/copy/admin/dataviz.ts`, `app/copy/admin/tables.ts`.

**Pages (8):**

- `app/pages/admin/layout.tsx`
- `app/pages/admin/dashboard/dashboard-page.tsx`
- `app/pages/admin/dataviz/dataviz-page.tsx`
- `app/pages/admin/participants/view-profile-page.tsx`
- `app/pages/admin/events/view-event-page/view-event-page.tsx`
- `app/pages/admin/events/view-event-page/send-toast.tsx`
- `app/pages/admin/events/view-event-participant/view-event-participant.tsx`
- `app/pages/admin/events/download-data.tsx`

**Dataviz components (17):** every `*-chart.tsx` under `app/components/pages/admin/dataviz/` plus `community-section.tsx`, `events-section.tsx`, `kpi-scores.tsx`. Axis labels, chart titles, and legends are copy; data keys are not. Each chart has an existing test — update its assertions to reference `datavizCopy`.

**Event and participant components (10):**

- `app/components/pages/admin/events/{demographics,event-status-form,dates-and-times,listmonk-filter-modal}.tsx`
- `app/components/pages/admin/participants/{participant-vs-event-data,participant-event-history,basic-data,admin-notes-box,financial-summary}.tsx`
- `app/components/pages/admin/listmonk-diagnostic-section.tsx`

**Tables (8):** everything under `app/components/organisms/tables/` from the inventory, including the ag-grid toolbar, the multi-select filter, the text modal editor, and `use-auto-save.ts`. `@ag-grid-community/locale` is already a dependency — check whether grid chrome strings already come from it before moving anything.

**Forms and business helpers:**

- `app/components/forms/admin/event-form.tsx`
- `app/lib/helpers/propMaps.ts` — **label side only**. Read the file and confirm which side of each map is persisted before moving anything.
- `app/business/common.ts`
- `app/business/admin/*` strings that reach the UI.

- [ ] **Step 1: Migrate each file with the recipe, one commit per logical group (pages, dataviz, events, participants, tables, forms)**

- [ ] **Step 2: Extend the guard globs with `app/pages/admin/**/*.tsx` and `app/components/pages/admin/**/*.tsx`**

- [ ] **Step 3: Run lint and the unit suite, then commit**

```bash
pnpm lint && pnpm test:unit
git add eslint.config.js
git commit -m "chore(lint): enable the copy guard for the admin area"
```

---

## Task 11: Migrate email templates

Emails build HTML strings, not React, so `Copy` does not apply and their copy stays plain text. They still get copy modules so the strings live in one place.

**Files:**

- Create: `app/copy/emails/application.ts`, `app/copy/emails/event-opening.ts`, `app/copy/emails/registration-limit.ts`
- Modify: `app/business/email/templates/application-mail.template.ts`
- Modify: `app/business/email/templates/event-opening-mail.template.ts`
- Modify: `app/business/email/templates/registration-limit-reached-admin.template.ts`
- Modify: `app/business/newsletter/create-event-opening-campaign.server.ts`
- Modify: `app/business/newsletter/create-pre-opening-reminder.server.ts`

- [ ] **Step 1: Move each template's static strings into its copy module**

Keep every `sanitizeHtml()` call exactly where it is. Copy modules hold static text only; user-controlled values stay interpolated and sanitised inside the template, never inside the copy module.

- [ ] **Step 2: Update the existing template tests**

These templates already have tests asserting rendered HTML, including XSS cases. Update the assertions to reference the copy modules; keep every existing case, especially the sanitisation ones.

- [ ] **Step 3: Run the email tests**

```bash
pnpm vitest --run app/business/email
```

Expected: PASS.

- [ ] **Step 4: Commit, one per template**

```bash
git commit -m "refactor(email): move the application mail copy into app/copy/emails"
```

---

## Task 12: Close out

**Files:**

- Modify: `CLAUDE.md`
- Modify: `app/components/organisms/news-dialog/news-utils.ts`
- Delete: `docs/plans/POS-480-centralizar-copy.md`

- [ ] **Step 1: Add a "Site Copy" section to `CLAUDE.md`**

Three points, then a pointer: all user-visible strings live in `app/copy/`; formatting is Markdown rendered through `~/components/atoms/copy/copy`, never JSX in copy; `react/jsx-no-literals` in `eslint.config.js` fails the build if a literal reappears in a migrated directory. Full convention in `app/copy/README.md`.

- [ ] **Step 2: Add the news dialog entry**

Per CLAUDE.md: add an item to `DEFAULT_NEWS_ITEMS` in `app/components/organisms/news-dialog/news-utils.ts`, remove any item older than two weeks, and set `NEWS_VERSION` in that same file to `Date.now()`. Mark it `isAdmin: true` — end users see no behavioural change.

- [ ] **Step 3: Run the full verification**

```bash
pnpm lint && pnpm test:unit && pnpm test:integration
```

Expected: all green.

**E2E runs only here, at the very end, and only when no other Playwright run is active.** Never during a migration task — a browser run mid-task competes with whatever else is using the machine. Check first, wait if something is running, then run:

```bash
while pgrep -f "@playwright/test/cli" > /dev/null; do
  echo "another Playwright run is active; waiting"
  sleep 30
done
pnpm test:e2e
```

That matches the test runner and its `test-server`, not `@playwright/mcp`, which is session tooling and can be ignored. If it never clears, stop and report rather than running two browser suites at once.

Until E2E runs, the per-file fidelity checks are the only guard against copy shifting, and they are blind to anything visual — spacing, layout, list markers. Both of the worst defects found in this effort were exactly that kind, and neither showed up in a test.

Another agent may be using the same local Supabase instance; if the integration run behaves oddly, check the database state before assuming a code fault.

- [ ] **Step 4: Delete this plan and commit**

```bash
git rm docs/plans/POS-480-centralizar-copy.md
git add -A
git commit -m "docs(copy): document the copy convention in CLAUDE.md"
```

---

## Risks

| Risk | Mitigation |
|---|---|
| Markdown rendering shifts spacing or list styling | `Copy` is built and tested first (Task 1); the pilot (Task 4 Step 4) and the rules page (Task 6 Step 4) both require a visual check. Fixes go into `copy.tsx`, never into individual components. |
| The typography plugin changed the warning banner | Already flagged; Task 9 Step 1 resolves it explicitly before anything else in that task. |
| A migration silently changes user-visible text | Prose is copy-pasted, never retyped; only markup is converted. The three deliberate fidelity changes are listed and need sign-off. Until the E2E run at the very end, the per-file text-and-tag-census comparison is the backstop, and anything visual needs a human look. |
| Domain enums get treated as copy and corrupt data | The "Not copy" list is explicit; Tasks 8 and 10 repeat the warning at the two files where it bites. |
| A link written in copy breaks client-side navigation | `Copy` routes any href starting with `/` through the `Link` atom instead of a bare anchor, so internal links do not full-page reload. Covered by a test in Task 1. |
| The lint rule produces a false positive | It only fires on JSX text children (`ignoreProps: true`), and Task 3 proves it fires on real files before anything depends on it. Legitimate non-copy text — a bare separator glyph, say — goes in `allowedStrings` rather than dropping a directory from the list. |
| Existing tests assert literal strings and break | Expected. Tasks 5, 10, and 11 name the specific suites. Update assertions to reference the copy module — never delete them. |
| The migration stalls half-done | Each task is independently shippable and ends with green lint. Tasks 1–7 alone deliver most of the editorial value. |

## Acceptance Criteria Mapping

| Ticket criterion | Where it is satisfied |
|---|---|
| Strings no longer hardcoded in components | Tasks 4–11; enforced by `react/jsx-no-literals` in `eslint.config.js` |
| Editing a text means touching one file | The `app/copy/` structure; one uniform pattern with no per-page exceptions; documented in `app/copy/README.md` |
| Type-safety on keys (compile error on unknown key) | `as const` objects plus `pnpm lint` running `tsc` |

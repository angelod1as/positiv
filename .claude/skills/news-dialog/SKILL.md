---
name: news-dialog
description: Use when deciding whether a change deserves a news dialog item and when adding one. Covers the bar a change must clear, the file format under app/components/organisms/news-dialog/items/, and the content rules. Triggers on "news item", "news dialog", "novidade", "anunciar mudanca".
---

# News Dialog Updates

The news dialog is for users, not a changelog. Announce a change only when it
clears the bar below. Most PRs do not clear it, and a dialog full of noise is
worse than an empty one — every item shown is attention taken from the items
that mattered.

**The bar: the change gives someone a new thing they can do, or removes work
they used to have to do.** If nobody changes what they do because of it, there
is no news item.

Clears the bar:

- "O admin agora candidata alguém com um botão só" — several steps became one
- A page, report, export, or permission that did not exist before
- A bug that was visibly breaking someone's work, now fixed
- A change to how someone has to work: a moved flow, a new required field, a
  screen that is gone

Does not clear the bar:

- "O formulário agora mostra progresso" — pleasant, but nobody works differently
- Visual polish, copy tweaks, layout, spacing, wording
- Performance, refactors, tests, CI, types, dependencies — invisible by
  definition
- Bugs nobody hit, or fixed before anyone noticed

Test: would a user be annoyed to have missed this? If not, skip it. In doubt,
skip it and say so in the PR rather than writing a weak item — a missing item
costs nothing, a noisy one costs the dialog's credibility.

When a change does clear the bar:

1. **Add one file** to `app/components/organisms/news-dialog/items/`, named
   `<YYYY-MM-DD>-<slug>.ts`:

   ```ts
   import type { NewsItemContent } from "../news"

   export default {
     title: "✨ Título curto",
     content: "O que mudou, para quem não é técnique.",
     isAdmin: false,
     createdAt: new Date("2026-08-17T12:00:00"),
   } satisfies NewsItemContent
   ```

2. **Never edit `news-utils.ts`** and never edit an existing item. The file
   collects `items/*.ts` with `import.meta.glob`, derives each `id` from the
   file name and derives `NEWS_VERSION` from the newest `createdAt`. There is
   no version to bump and no array to prepend to — that is exactly what used
   to make every PR conflict.

3. **Content guidelines**:
   - Write for NON-TECHNICAL USERS (functionality, not implementation)
   - ✅ GOOD: "Now you can generate demographic reports by clicking the new button"
   - ❌ BAD: "Added demographics upsert functionality to the database"
   - `isAdmin: true` items may include operational detail, still no code specifics
   - Copy is Brazilian Portuguese

4. **Retiring items**: items older than two weeks stop rendering by
   themselves. Deleting the file is optional housekeeping and never urgent.


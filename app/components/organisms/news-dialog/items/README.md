# News items

One file per news item. Adding, and later deleting, a file is the whole
workflow — `news-utils.ts` never changes, so news never causes a merge
conflict between branches.

## Adding an item

Create `<YYYY-MM-DD>-<slug>.ts`:

```ts
import type { NewsItemContent } from "../news"

export default {
  title: "✨ Título curto",
  content: "O que mudou, em português, para quem não é técnique.",
  isAdmin: false,
  createdAt: new Date("2026-08-17T12:00:00"),
} satisfies NewsItemContent
```

The date in the file name is for humans sorting the folder; `createdAt` is
what the dialog actually reads. Keep the two in sync.

## Rules

- Write for non-technical users: what they can now do, not what changed in the
  code. `isAdmin: true` items may mention operational detail.
- Copy is Brazilian Portuguese — it is user-facing.
- Never edit an existing item to announce something new; add a file.
- Items older than two weeks stop rendering on their own. Deleting them is
  housekeeping, safe to do at any time, and can never conflict.
- There is no version to bump: `NEWS_VERSION` is the newest `createdAt`.

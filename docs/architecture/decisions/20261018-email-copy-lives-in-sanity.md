# Email copy lives in Sanity, rendered through the shared placeholder renderer

- Status: accepted
- Date: 2026-10-18
- Tags: architecture, public-site, cms, email

## Context

The transactional emails — the payment link first — carry a lot of wording with
a little dynamic data, all hardcoded in `app/copy/emails/` and only changeable
by a deploy. Editors should be able to reword them, as they already can the
WhatsApp payment message ([POS-607](https://linear.app/positiv/issue/POS-607)),
without touching the HTML that renders them.

## Decision

The editable wording of an email — subject, heading, body — moves to Sanity, in
a single **E-mails** singleton (`emailTemplates`) with one object per email.
Everything else stays in code: the HTML layout and its styling, the footer, the
prices, dates and other values, and the choice of which lines appear.

- **One placeholder syntax, one renderer.** `{{variable}}` tokens, rendered by
  the module generalised from POS-607's `renderPaymentMessage`. It substitutes
  the documented variables and **throws on an unknown one** — never a silent
  blank — and now takes the whitelist as an argument, so the WhatsApp message
  and every email share it. No templating library: the only candidates that are
  logic-less (Mustache) blank unknown variables by default, which is the one
  behaviour we must not have.
- **Each field declares the placeholders it allows.** The Studio rejects an
  unknown one on publish, the zod contract rejects it in `pnpm test:contract`,
  and the renderer throws if one still reaches it. The lists live in one module
  the Studio schema, the contract and the renderer all read.
- **Wording may be richly formatted; data is not typed by Editors.** A body is
  Portable Text restricted to bold and italic, serialised to inline HTML by a
  small in-house serializer; the layout owns the block wrappers. Plain fields
  are plain strings. Values are HTML-escaped exactly as before, so a
  participant's name cannot inject markup.
- **Its own cached read, not the site snapshot.** Email copy is fetched by its
  own query into its own cache (60s, stale on failure), read only when an email
  is sent. It never enters the per-navigation site snapshot that every page load
  pays for, unlike the WhatsApp message, which renders inside an admin page.

The payment-link email renders byte-for-byte as before the move, proved by a
golden snapshot captured from the original template.

## Consequences

### Positive

- Editors reword an email without a deploy, within a layout they cannot break.
- The WhatsApp message and the emails share one syntax, one validator and one
  renderer, so there is no second templating approach to learn or keep in step.
- Email copy stays off the hot path: one cached read per 60s at send time.

### Negative

- A second representation of each moved string exists: the Sanity document and
  the code fallback. The fallback is deliberate (see the fallback ADR) and the
  same renderer produces the body on both paths, so they cannot drift silently.
- The Portable Text serializer is new surface, kept minimal (bold, italic) and
  pinned by the byte-for-byte test.

### Neutral

- Layout, prices, dates and the footer are unchanged and still ship in code.

## Alternatives Considered

1. **A templating library (Handlebars, Mustache)**
   - Pros: a known syntax, off-the-shelf.
   - Cons: Mustache blanks unknown variables by default — the one behaviour we
     forbid; Handlebars is logic-ful and heavy and would need locking down.
     Either way it would reimplement the throw-on-unknown we already have.

2. **One singleton per email**
   - Pros: each email is its own desk entry.
   - Cons: a sidebar row each for rarely-touched copy. One consolidated
     singleton keeps them together.

3. **Fold email copy into the site snapshot, like the WhatsApp message**
   - Pros: one cache for all CMS content.
   - Cons: emails are never on a page-render path, so every page load would pay
     to fetch copy it never uses.

4. **Plain text with literal HTML tags instead of Portable Text**
   - Pros: trivial byte-for-byte equality, no serializer.
   - Cons: Editors would type raw `<strong>` tags. Rich text keeps the markup
     out of their hands.

## References

- [No repository fallback for Public Site content](./20260924-no-repository-fallback-for-public-site-content.md)
- [Transactional email copy falls back to code when Sanity is down](./20261018-transactional-email-copy-falls-back-to-code.md)
- [POS-607: the WhatsApp payment message this generalises](https://linear.app/positiv/issue/POS-607)

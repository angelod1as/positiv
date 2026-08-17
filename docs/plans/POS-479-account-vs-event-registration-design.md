# POS-479 — Account signup is not event registration (design)

Status: pending review
Date: 2026-08-14
Linear: POS-479 (children: POS-481, POS-482)

## Problem

People create an account on the site and believe they are going to the party. There are
real complaints from people who signed up on the site and thought they had registered for
the event.

Three things reinforce the misunderstanding today:

1. The signup CTA itself says "Inscreva-se" (`app/pages/auth/register-page.tsx:55`,
   `app/pages/auth/login-page.tsx:92`). The person literally "signed up" — on the site.
2. Nothing at the end of the signup flow says an account is not a spot at an event.
   `extraBasicData` (`app/business/participant/basic-data.server.ts:157`) saves the profile
   and redirects straight to the dashboard with a "Dados salvos com sucesso" toast.
3. The dashboard is titled "Meus Eventos" but groups every event by *event status*
   ("Inscrições abertas", "Inscrições encerradas", "Eventos agendados"), never by "am I in
   this one". An event the person applied to looks like any other card except that its
   button turns into a red "Cancelar inscrição".

## Decisions

| Decision | Choice |
| --- | --- |
| Post-signup moment | A dedicated page as the last step of signup |
| Dashboard shape | Two sections plus a one-line summary banner |
| Banner audience | Only people who have never applied to any event |
| Signup CTA wording | "Inscreva-se" becomes account-creation wording |
| "Candidatura" vocabulary | Out of scope — POS-481 |
| Post-application confirmation page | Out of scope — POS-482 |

An event the person applied to appears **only** in their own section. Nothing is listed twice.

## Scope

### 1. Signup CTA wording

Creating an account must not be called "inscrição".

- `app/pages/auth/register-page.tsx` — card title "Inscreva-se" becomes "Criar conta"
- `app/pages/auth/login-page.tsx:92` — "Não tem uma conta? Inscreva-se" becomes
  "Não tem uma conta? Criar conta"

### 2. New page: account ready

Route `/conta/tudo-pronto`, added to `paths.ts` as `ACCOUNT_READY` under `dash.account`,
registered inside the existing `pages/account/layout.tsx` block in `app/routes.ts`.

`extraBasicData` redirects to it **only** when the profile is completing basic data for the
first time — that is, when `currentProfile.basic_data_filled` is still `false` at submit
time — and the profile is not an admin. Every other case keeps the current destination
(`DASHBOARD` or `ADMIN_DASHBOARD`). A veteran editing their data later never sees it.

The page is static: no loader data, no persisted "seen" state. Someone who reaches the URL
directly just reads it and clicks through.

Copy (Brazilian Portuguese):

- Title: `Sua conta está pronta! 🎉`
- `Mas atenção: ter conta na Positiv não é o mesmo que estar em uma festa.`
- `Cada evento tem inscrição própria. Para ir a um evento, você precisa se inscrever nele — e a inscrição vale só para aquele evento.`
- `Depois que você se inscreve, a organização seleciona quem vai. Você recebe a resposta por email.`
- Button → `/dashboard`: `Ver eventos da Positiv`

### 3. Dashboard redesign

`app/pages/dashboard/dashboard-page.tsx` goes from three status sections to two ownership
sections plus a banner.

**Data**

- `getNextEvents` already returns `is_applied` per event. No change.
- New query `hasEverApplied(profileId)`: whether any `event_participants` row exists for the
  profile, regardless of `is_user_applied`. Cancelling an application is an `UPDATE` that
  sets `is_user_applied = false` and keeps the row
  (`app/business/participant/cancel-application-to-event.server.ts`), so a person who
  cancelled still counts as having applied and never sees the banner again.
- `splitEvents` changes from three status buckets to two ownership buckets: `applied`
  (`is_applied === true`) and `available` (everything else). Order inside each bucket stays
  the query order (soonest first).

**Banner** — rendered only when `hasEverApplied` is false:

- Title: `Sua conta está pronta`
- Body: `Mas ter conta não te coloca em nenhuma festa. Escolha um evento abaixo e faça sua inscrição.`

The message lives in the body, not the title: `AlertTitle` clamps to a single line
(`app/components/ui/alert.tsx`), which would truncate a full sentence on narrow screens.

**Section 1 — `Eventos em que você se inscreveu`**

Always rendered, even when empty. Empty state:
`Você não tem nenhuma inscrição no momento.`

The empty state carries no call to action. For a newcomer it appears together with the
banner, which already says what to do next; for someone who cancelled their only
application the banner is gone, and the events below are the obvious next step.

**Section 2 — `Eventos da Positiv`**

Every event the person has not applied to, whatever its status. Empty state:
`Nenhum evento por aqui no momento.`

**Status badge on the card**

The status information that section headings used to carry moves onto the card as a badge,
derived from `checkEventStatus`, next to the existing `BDSMBadge`:

- open → `Inscrições abertas`
- scheduled → `Em breve`
- closed → `Inscrições encerradas`

`EventCardFooter` behaviour and button labels do not change here. Renaming them to
"candidatura" is POS-481.

**Skeleton**

`app/components/organisms/event-list/event-list-skeleton.tsx` still renders the three old
headings. It is the `Suspense` fallback for this page, so it must mirror the new two-section
layout or the old layout flashes on every load.

### 4. News dialog

Add an item to `DEFAULT_NEWS_ITEMS` in
`app/components/organisms/news-dialog/news.tsx` describing the clearer dashboard in
non-technical terms, remove items older than two weeks, and bump `NEWS_VERSION` in
`app/lib/helpers/constants.ts` to `Date.now()`.

## Testing

### Unit (Vitest)

- `split-events` — currently untested. New tests for the applied/available split, including
  empty input and an event that is applied but whose registration is closed.
- `hasEverApplied` — returns false with no rows, true with a cancelled row.
- New account-ready page — renders the explanation and links to `/dashboard`.
- Dashboard — banner renders when the person never applied, does not render when they have;
  the applied section renders its empty state; an applied event appears only in the applied
  section.
- Status badge — one test per status.
- `app/pages/auth/login-page.test.tsx:199` matches `/Inscreva-se/i` and must follow the new
  CTA wording.

### E2E (Playwright)

The auth setup walks the real signup flow, so the new page sits directly in its path.

- `e2e/fixtures/auth.ts:165-171` — after the second "Continuar" the helper waits for
  navigation straight to the dashboard. It must instead assert the account-ready page and
  click its CTA to reach the dashboard, keeping the setup on the real flow. Admin login is
  unaffected because admins keep redirecting to `/admin`.
- `e2e/pages/EventsPage.ts:16,17,22` — heading locators for the old sections.
- `e2e/tests/authenticated/dashboard-streaming.spec.ts:79,82,87,88` — waits and counts on the
  old headings.
- `e2e/tests/authenticated/user-access-control.spec.ts:55` and
  `e2e/tests/authenticated/admin-access-control.spec.ts:72` — assert the "Inscrições abertas"
  heading.
- `e2e/tests/unauthenticated/onboarding-flow.spec.ts:21,28` — match `/inscreva-se/i` on the
  register link and page.

New E2E coverage:

- A new person sees the account-ready page at the end of signup, and the banner plus the
  empty applied section on the dashboard.
- After applying, the event moves out of "Eventos da Positiv" into "Eventos em que você se
  inscreveu" and appears exactly once.
- Someone who has applied before does not see the banner.

`MyApplicationsPage.ts` and the "Fazer inscrição" button locators stay valid — button labels
do not change in this ticket.

## Out of scope

- POS-481 (urgent) — adopt "candidatura" as the product term across the event journey.
- POS-482 — a confirmation page after completing an application.

## Risks

- People who signed up before this change never see the account-ready page; the banner is
  their only cue. Accepted.
- A single "Eventos da Positiv" list is longer than three status lists when there are many
  events. Accepted; the badge carries the status.
- The e2e auth setup is a shared dependency of every authenticated project. If its update is
  wrong, the whole authenticated suite fails at setup rather than in a single spec.

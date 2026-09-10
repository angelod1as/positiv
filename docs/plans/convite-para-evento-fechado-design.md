# Invite a participant into a closed event — Design

**Status:** approved, awaiting implementation plan
**Date:** 2026-09-10
**Ticket:** NO-TICKET

## The problem

Registrations close, and then someone has to get in anyway. It happens three or
four times per event. Today the only way through is to reopen the event, rush
the person into the form before anyone else notices, and close it again — a
race against the public, run by hand, on production.

## What we are building

An admin picks an existing person from a searchable list on the event page and
generates a link for them. The link lets that one person — and nobody else —
through the "registrations closed" gate for that one event. They still take the
rules quiz and fill in their own application, exactly like everyone else. The
event never reopens.

The point is the process, not the seat: the person goes through the funnel
without the funnel being opened to the public. Adding a participant straight
from the admin already exists and is not what this replaces.

## Why the invite is bound to a profile

Two earlier shapes were considered and rejected.

**A shared per-event secret** would have to be carried in a cookie, because
nothing else identifies the visitor before they apply. A cookie is per browser:
the link opened on a phone and the application filled on a desktop is a broken
flow with no diagnosis. It also means a forwarded link works for whoever
receives it.

**A generic single-use token, claimed by whoever opens it first**, fixes
neither problem completely and adds a race.

Binding the invite to `profile_id` at generation time makes the token a pointer
rather than a secret. A leaked link is useless to anyone but its owner, the
authorization survives logout and device changes because it lives in the
database, and the admin sees who was invited.

The cost is that the person must already have an account. That is accepted: the
team asks people to register first, then sends the invite.

## Data

One table. RLS denies `anon` and `authenticated`; only `service_role` reads it,
so the token never reaches participant loader data.

```sql
create table event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  revoked_at timestamptz,
  unique (event_id, profile_id)
);
```

`unique (event_id, profile_id)` means a person can hold at most one invite per
event. Asking for a second one returns the existing link rather than minting a
rival.

`used_at` is stamped when the application is *submitted*, not when the link is
opened — opening is not using. An invite is valid while `revoked_at` is null,
regardless of `used_at`, so a person who cancels and changes their mind can use
the same link again.

An invite dies with its event and with its profile, by cascade.

## The gate

`applyToEvent` (`app/business/participant/apply-to-event.server.ts:32`)
currently rejects any application to an event whose `event_status` is
`Registration Closed`. It becomes: closed **and** without a valid invite for
the current profile → reject.

The check runs against the database, keyed by the signed-in profile. The button
in the UI is a consequence of that fact, never the source of it.

**No spot limit has to be bypassed, and none exists to bypass.**
`close_registrations_at_limit` (migration `20260201130100`) only runs
`IF current_status = 'Registration Open'` and closes at a hardcoded 90 — it is
not a constraint on inserts and it does not read `total_spots`. Once the event
is closed the trigger is inert, so it neither blocks the invited application
nor fires the registration-limit email. No migration touches it.

## Admin flow

A "Convidar participante" button on `view-event-page`, secondary to the
controls already there and placed above the general event data. It opens a
modal, following the `ManagePaymentModal` pattern already on that page
(`app/pages/admin/events/view-event-page/view-event-page.tsx:212`).

Inside the modal:

- **One search field**, matching full name, social name, email and phone.
  Search runs on the server and returns **at most 5 results**. Names are matched
  with `unaccent`; `profiles.phone` is a number, so a phone query is reduced to
  its digits before comparison.
- **Help text** under the field, in the muted style the forms use, saying what
  can be searched and how to type a phone number.
- **Each result row** carries a "Convidar" button. A person already registered
  for this event shows a disabled button labelled "Já participante".
- **A secondary list** of the people already registered for the event.
- **The invites already generated** for this event, each with its status —
  gerado, usado, revogado — a copy button for the link, and a revoke button.
- Generating shows the link with a copy button. If an invite already exists for
  that person and event, the existing link is shown instead of a new one.

Generating and revoking require the admin role that already guards the area
(`app/pages/guard/admin.tsx`). No new role.

Nothing marks the invited person anywhere in the participants list. Once they
are in, they are a participant like any other.

## Participant flow

`/convite/:token` — a public route, because the visitor will usually arrive
signed out.

| Situation | Result |
| --- | --- |
| Signed in as the invite's owner | Continue to the event's rules quiz |
| Signed out | Redirect to `/entrar?redirect_to=/convite/<token>`, then back here |
| Signed in as someone else | "This invite belongs to someone else" — no event, no name, no owner disclosed |
| Token unknown or revoked | "Invalid invite" |

From the rules quiz onward the flow is the ordinary one: quiz, application
form, confirmation. On the dashboard, a closed event the person holds a valid
invite for shows the application button instead of the disabled "Inscrições
encerradas" — read from the database by profile, so it works on any device.

## `redirect_to` on the login

Today `signIn` (`app/business/auth/sign-in.server.ts:72`) sends everyone to
`DASHBOARD` or `ADMIN_DASHBOARD`, and `getUserContext`
(`app/business/auth/auth.server.ts:156`) throws a signed-out visitor at
`/entrar` without recording where they were going. An invited person arriving
signed out would lose the invite at the door.

The login learns to honour a `redirect_to` query parameter: the login page
reads it from the URL and sends it with the credentials, and `signIn` returns
it as the destination when it is acceptable.

**This value arrives from the client and must be validated on the server.**
Accepting it as given is an open redirect: `/entrar?redirect_to=https://evil.example`
would have our own domain deposit a freshly signed-in person on someone else's
site. `signIn` accepts a same-site relative path only — it must start with a
single `/`, must not start with `//` or `/\`, and must carry no scheme and no
host. Anything else is ignored and the default destination stands.

This is a general improvement, not an invite-specific one: any private link
opened while signed out now survives the login.

**Registration is out of scope.** Carrying `redirect_to` through sign-up would
mean carrying it through the Supabase confirmation email, a much longer chain.
People register before they are invited.

## Copy

All user-facing strings go in `app/copy/`, per the project convention — the
admin modal, the invite-page outcomes, and the dashboard button. Brazilian
Portuguese.

## Testing

- **Integration** — the gate. A closed event rejects an uninvited profile,
  accepts an invited one, rejects a revoked invite, and rejects an invite
  belonging to a different profile. Invite generation is idempotent per
  `(event_id, profile_id)`. Search matches name, social name, email and a phone
  typed with punctuation, and returns at most 5.
- **Unit** — `redirect_to` validation, over a table of hostile inputs
  (`//evil.example`, `https://evil.example`, `/\evil.example`, a scheme-relative
  path, an absolute URL with our own host). The modal's rendering of each row
  state: invitable, already a participant, already invited.
- **E2E** — one journey, run once at the end: an invited person opens the link
  signed out, logs in, lands back on the invite, takes the quiz, applies to a
  closed event, and appears in the admin list.

## Out of scope

- Inviting someone who has no account
- Expiry dates on invites — revoking is the control
- Any change to the registration-limit email or its trigger
- Any marker distinguishing invited participants after they join
- Carrying `redirect_to` through registration and email confirmation

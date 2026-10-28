# Analytics events are typed, anonymous and sent from the browser

- Status: accepted
- Date: 2026-10-27
- Tags: architecture, analytics, privacy

## Context

Positiv had loaded Umami for a long time and never used the data. The events were free strings
with inconsistent names (`*_clicked`, `*_completed`, `*_blocked`). Some payloads carried personal
data: the user id on login, the profile id on a blocked signup, and the e-mail domain on a refused
one. Nine of the events were posted by the server, from its own address with a hardcoded
User-Agent, so Umami counted them as one visitor and no journey could be built from them. The
script also loaded on `/admin/*`, so admin browsing was counted alongside participants.

## Decision

- **The database answers for outcomes, Umami for behaviour.** Registrations, payments, attendance
  and retention are read from the database (`/admin/numeros`). Umami covers navigation, clicks,
  acquisition channel and the drop-offs that happen before a database row exists.
- **Events are sent from the browser only.** An outcome the server decides is reported by the
  page once the response comes back, so it belongs to the visitor's real session. An event the
  browser never sees is dropped: the database already holds that fact.
- **No personal data, enforced by types.** `app/lib/analytics/events.ts` maps every event name to
  its payload. `trackEvent` accepts only those names with their exact payload. The registry is
  constrained so payload values are primitives and the fields `email`, `name`, `cpf`, `phone`,
  `userId`, `profileId` and `domain` cannot be declared. Payloads carry enums, slugs and event
  ids. The registry is the list of events; no other list is kept.
- **Names are `object_action`, snake_case, past tense**, e.g. `application_submitted`,
  `signup_refused`.
- **Cookieless, one Umami website** for the Public Site and the Platform. They share one domain
  and one journey.
- **Admin pages are not counted.** The script is not rendered on `/admin/*`, and a
  `data-before-send` hook refuses every send while the browser is on an admin path. The hook
  covers the client-side navigation into admin that the missing tag cannot.
- **The numbers are read as journeys, not statistics.** The audience is niche and the volumes are
  small.
- **E-mail links carry UTM parameters** (`utm_source=email`,
  `utm_medium=transactional|newsletter`, `utm_campaign=<template>`), not a redirect route.

## Consequences

### Positive

- A typo in an event name, or a payload field holding personal data, fails `tsc`.
- Every event belongs to a real visitor session, so funnels and journeys can be built.
- Admin browsing no longer inflates the numbers.

### Negative

- An outcome whose response never reaches the browser (a closed tab, a dropped connection) is
  not counted in Umami. The database still has it.
- A new event needs a registry entry before it can be sent.

### Neutral

- The data recorded before the rename is wiped from the Umami website once this ships. It had
  never been used.

## Alternatives Considered

1. **Keep server-side events**: post to Umami from the server with the visitor's IP and
   User-Agent forwarded.
   - Pros: counts outcomes the browser never sees.
   - Cons: the event still sits outside the visitor's session, and the database already holds
     those outcomes.

2. **A runtime allow-list of payload fields**
   - Pros: catches data built dynamically.
   - Cons: fails in production instead of at build time. The registry's types reject the field
     where it is written.

## References

- POS-625 (this decision), POS-405 (replaced)
- Follow-ups: POS-640 (click tracking), POS-641 (participant funnel), POS-642 (e-mail UTMs)
- [Umami tracker configuration](https://umami.is/docs/tracker-configuration)

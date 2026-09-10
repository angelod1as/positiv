# NO-TICKET — Invite a participant into a closed event — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin generates a link for one named person that lets that person — and nobody else — apply to an event whose registrations are closed, without reopening the event.

**Architecture:** A single `event_invites` row binds `(event_id, profile_id, token)`. The token is a pointer, not a secret: authorization is the row, read server-side by the signed-in profile, so a forwarded link is useless and the invite survives a device change. `applyToEvent` gains one condition. On the way, the login learns a server-validated `redirect_to`, so a private link opened while signed out survives the trip through `/entrar`.

**Tech Stack:** Postgres/Supabase migrations, Kysely, composable-functions, Zod, React Router 7, ShadcN dialog, Vitest + React Testing Library, Playwright.

**Spec:** `docs/plans/convite-para-evento-fechado-design.md`

**Branch:** `add-participant-to-event`, worktree `wt/add-participant-to-event` (already checked out).

---

## Ground rules for whoever executes this

- **TDD is non-negotiable.** Every task writes the failing test first, runs it, watches it fail *on behaviour*, then implements. A test that fails because a file is missing proves nothing.
- **Never reach the database outside `pnpm test:integration` / `pnpm test:e2e`.** Both take a cross-worktree lock. Running `vitest --config vitest.integration.config.ts` directly corrupts other agents' data.
- **Before any integration run**, check the lock:
  ```bash
  cat "$(git rev-parse --git-common-dir)/db-lock/owner" 2>/dev/null
  ```
  Output means another run holds it — wait ~5 minutes and check again. Never delete the lock directory unless the `pid` is genuinely dead.
- **Do not run `supabase db reset`.** Other agents share this local database. Use `supabase migration up`.
- **E2E runs once, as the very last step** (Task 18). Never as a mid-task check.
- **No `@ts-ignore`.** Fix the type.
- **Every user-visible string goes in `app/copy/`.** Brazilian Portuguese there; everything else in English.
- **Commit messages end at the last line of the body.** No `Co-Authored-By`, no `Claude-Session`, no attribution footer, anywhere.

---

## File structure

**Created:**

| File | Responsibility |
| --- | --- |
| `supabase/migrations/<ts>_event_invites.sql` | The table, its RLS, the `unaccent` extension |
| `app/business/admin/event-invites.server.ts` | Admin side: create, revoke, list invites |
| `app/business/admin/event-invites.integration.test.ts` | Tests for the above |
| `app/business/admin/search-profiles.server.ts` | The modal's search: name, social name, email, phone; 5 results |
| `app/business/admin/search-profiles.integration.test.ts` | Tests for the above |
| `app/business/participant/event-invite.server.ts` | Participant side: find a valid invite, stamp `used_at` |
| `app/business/participant/event-invite.integration.test.ts` | Tests for the above |
| `app/lib/helpers/safe-redirect.ts` | Validates a client-supplied `redirect_to` |
| `app/lib/helpers/safe-redirect.test.ts` | Hostile-input table |
| `app/pages/api/admin/event-invite.ts` | POST endpoint: create / revoke |
| `app/pages/invite/invite-page.tsx` | `/convite/:token` — the public landing route |
| `app/components/organisms/event-invite-modal/event-invite-modal.tsx` | The admin modal |
| `app/components/organisms/event-invite-modal/event-invite-modal.test.tsx` | Modal unit tests |
| `app/copy/admin/invites.ts` | Admin-facing strings |
| `e2e/utils/invite-helpers.ts` | Seeds a closed event and an invite for the E2E suite |
| `e2e/tests/authenticated/admin-invite-closed-event.spec.ts` | The admin half of the journey |
| `e2e/tests/authenticated/user-invited-closed-event.spec.ts` | The participant half |

**Modified:**

| File | Change |
| --- | --- |
| `app/test/db-test-utils.ts` | `createTestEventInvite`, `event_invites` in the cleanup order |
| `app/business/participant/apply-to-event.server.ts:32` | The gate |
| `app/business/common.ts` | `invited` on the apply input schema |
| `app/pages/api/events/submit-application.ts` | Pass the invite through |
| `app/pages/homepage/fetch/get-next-events.ts` | `is_invited` on dashboard events |
| `app/components/organisms/event-card/event-card-footer.tsx:158` | Closed + invited shows the apply button |
| `app/business/auth/sign-in.server.ts:72` | Honour a validated `redirect_to` |
| `app/business/auth/auth.server.ts:156` | Carry the current path into the login URL |
| `app/pages/auth/login-page.tsx` | Read `?redirect_to=` and send it with the credentials |
| `app/pages/api/auth/login.ts` | Pass `redirectTo` to `signIn` |
| `app/pages/admin/events/view-event-page/view-event-page.tsx:230` | The button, above `<GeneralData />` |
| `app/routes.ts` | `/convite/:token`, `/api/admin/event-invite` |
| `app/lib/paths.ts` | `INVITE`, `ADMIN_EVENT_INVITE_COMMIT` |
| `app/copy/events.ts` | Participant-facing invite strings |
| `e2e/tests/unauthenticated/auth-redirect.spec.ts` | Its exact-URL assertion breaks; see Task 12 |

---

### Task 1: The migration

**Files:**
- Create: `supabase/migrations/<timestamp>_event_invites.sql`

- [ ] **Step 1: Write the migration**

Generate the timestamp with `date -u +%Y%m%d%H%M%S` and name the file
`supabase/migrations/<that>_event_invites.sql`.

```sql
-- An invite lets one named person past a closed event's gate, without the
-- event reopening for anyone else.
--
-- The token is a pointer, not a secret: it names an (event, profile) pair, and
-- authorization is the row read against the signed-in profile. A link
-- forwarded to somebody else is inert, and the invite survives a device change
-- because nothing about it lives in a cookie.
CREATE TABLE IF NOT EXISTS public.event_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at    timestamptz,
  revoked_at timestamptz,
  UNIQUE (event_id, profile_id)
);

CREATE INDEX IF NOT EXISTS event_invites_event_id
  ON public.event_invites (event_id);

ALTER TABLE public.event_invites OWNER TO postgres;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.event_invites TO service_role;
REVOKE ALL ON TABLE public.event_invites FROM anon, authenticated;

DROP POLICY IF EXISTS service_role_all_access_event_invites ON public.event_invites;
CREATE POLICY service_role_all_access_event_invites ON public.event_invites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny_event_invites ON public.event_invites;
CREATE POLICY anon_deny_event_invites ON public.event_invites
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS authenticated_deny_event_invites ON public.event_invites;
CREATE POLICY authenticated_deny_event_invites ON public.event_invites
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.event_invites IS
'One invite per (event, profile). Valid while revoked_at is null, whatever
used_at says -- somebody who cancels and changes their mind uses the same link
again. used_at is stamped when the application is submitted, not when the link
is opened: opening is not using.';

-- The admin''s search matches names as they are typed, without accents.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
```

- [ ] **Step 2: Apply it**

Check the database lock first, as the ground rules say. Then:

Run: `supabase migration up`
Expected: the new migration listed as applied, no error.

- [ ] **Step 3: Regenerate the types**

Run: `pnpm db:types --local`
Expected: `app/types/database/database.types.ts` gains an `event_invites` entry with `id`, `event_id`, `profile_id`, `token`, `created_at`, `used_at`, `revoked_at`.

- [ ] **Step 4: Verify the types compile**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations app/types/database
git commit -m "feat(invites): add the event_invites table

One invite per (event, profile), valid while it is not revoked. RLS keeps
it to service_role, so the token never reaches participant loader data.
unaccent comes along for the admin search."
```

---

### Task 2: Test fixtures

`cleanupTestData` deletes by a hardcoded table order. A new table absent from
that list leaks rows between tests and eventually breaks the foreign keys of
every other suite, so the factory and the cleanup entry land together.

**Files:**
- Modify: `app/test/db-test-utils.ts`

- [ ] **Step 1: Add `event_invites` to the cleanup order**

In `cleanupTestData`, the `tableOrder` array currently reads:

```ts
  const tableOrder = [
    "payments",
    "event_participants",
    "event_demographics_history",
    "events",
    "user_roles",
    "profiles"
  ]
```

Make it:

```ts
  const tableOrder = [
    "payments",
    "event_participants",
    "event_invites",
    "event_demographics_history",
    "events",
    "user_roles",
    "profiles"
  ]
```

- [ ] **Step 2: Add the deletion branch**

In the same function's `switch (table)`, alongside the existing cases:

```ts
        case "event_invites":
          await kysely
            .deleteFrom("event_invites")
            .where("id", "in", ids)
            .execute()
          break
```

- [ ] **Step 3: Add the factory**

Next to `createTestEventParticipant`:

```ts
export async function createTestEventInvite(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  data: {
    event_id: string
    profile_id: string
    token: string
    [key: string]: unknown
  }
): Promise<Selectable<DatabaseTypes["public"]["Tables"]["event_invites"]["Row"]>> {
  const invite = await kysely
    .insertInto("event_invites")
    .values(data as Insertable<DatabaseTypes["public"]["Tables"]["event_invites"]["Row"]>)
    .returningAll()
    .executeTakeFirstOrThrow()

  tracker.track("event_invites", invite.id)
  return invite
}
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/test/db-test-utils.ts
git commit -m "test(invites): add the event_invites fixture and cleanup

A table missing from the cleanup order leaks rows into every other suite,
so the factory and the deletion branch land together."
```

---

### Task 3: The participant's side of an invite

Two modules rather than one, following the actor split the codebase uses. This
is the one the participant flow reads.

**Files:**
- Create: `app/business/participant/event-invite.server.ts`
- Test: `app/business/participant/event-invite.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventInvite,
  createTestProfile,
} from "~/test/db-test-utils"
import {
  findValidInvite,
  findValidInviteByToken,
  markInviteUsed,
} from "./event-invite.server"

describe("event invites, from the participant's side", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let eventId: string
  let profileId: string
  let otherProfileId: string

  beforeEach(async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Invite test event",
      event_status: "Registration Closed",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    eventId = event.id

    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `invited-${randomUUID()}@test.com`,
      full_name: "Invited Person",
    })
    profileId = profile.id

    const other = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `other-${randomUUID()}@test.com`,
      full_name: "Other Person",
    })
    otherProfileId = other.id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("finds an invite for the profile it belongs to", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    const invite = await findValidInvite(eventId, profileId)

    expect(invite?.profile_id).toBe(profileId)
  })

  it("finds nothing for a profile that was not invited", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    const invite = await findValidInvite(eventId, otherProfileId)

    expect(invite).toBeUndefined()
  })

  it("finds nothing once the invite is revoked", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
      revoked_at: new Date().toISOString(),
    })

    const invite = await findValidInvite(eventId, profileId)

    expect(invite).toBeUndefined()
  })

  it("keeps finding an invite that has already been used", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
      used_at: new Date().toISOString(),
    })

    const invite = await findValidInvite(eventId, profileId)

    expect(invite?.profile_id).toBe(profileId)
  })

  it("finds an invite by its token", async () => {
    const token = `tok-${randomUUID()}`
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token,
    })

    const invite = await findValidInviteByToken(token)

    expect(invite).toMatchObject({ event_id: eventId, profile_id: profileId })
  })

  it("finds nothing for an unknown token", async () => {
    const invite = await findValidInviteByToken(`tok-${randomUUID()}`)

    expect(invite).toBeUndefined()
  })

  it("stamps used_at once the application is in", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    await markInviteUsed(eventId, profileId)

    const invite = await findValidInvite(eventId, profileId)
    expect(invite?.used_at).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Check the database lock, then run: `pnpm test:integration -- event-invite`
Expected: FAIL — `event-invite.server` has no export named `findValidInvite`.

- [ ] **Step 3: Write the implementation**

```ts
import { kyselyDb } from "~/kysely-db"

/**
 * An invite is valid while nobody revoked it. `used_at` is deliberately not
 * consulted: someone who applied, cancelled, and thought better of it opens the
 * same link again.
 */
export async function findValidInvite(eventId: string, profileId: string) {
  return await kyselyDb
    .selectFrom("event_invites")
    .selectAll()
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .where("revoked_at", "is", null)
    .executeTakeFirst()
}

export async function findValidInviteByToken(token: string) {
  return await kyselyDb
    .selectFrom("event_invites")
    .selectAll()
    .where("token", "=", token)
    .where("revoked_at", "is", null)
    .executeTakeFirst()
}

export async function markInviteUsed(eventId: string, profileId: string) {
  await kyselyDb
    .updateTable("event_invites")
    .set({ used_at: new Date().toISOString() })
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .where("revoked_at", "is", null)
    .execute()
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm test:integration -- event-invite`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add app/business/participant/event-invite.server.ts app/business/participant/event-invite.integration.test.ts
git commit -m "feat(invites): read a participant's invite

Valid means not revoked; used_at does not close it, so someone who
cancels can come back through the same link."
```

---

### Task 4: The gate

The behaviour the whole feature exists for.

**Files:**
- Modify: `app/business/participant/apply-to-event.server.ts:32`
- Modify: `app/business/common.ts` (the `applyToEventInputSchema`)
- Test: `app/business/participant/apply-to-event-invite.integration.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { randomUUID } from "node:crypto"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventInvite,
  createTestProfile,
} from "~/test/db-test-utils"
import { applyToEvent } from "./apply-to-event.server"

vi.mock("./send-application-mail.server", () => ({
  sendApplicationMail: vi.fn().mockResolvedValue({ emailSent: false }),
}))

describe("applying to a closed event with an invite", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let eventId: string
  let profileId: string

  const answers = () => ({
    eventId,
    applicationDate: new Date(),
    referred: "Administração",
    bond: "Posso ir sozinhe." as const,
  })

  // applyToEvent writes through the supabase client on the context, so the
  // test hands it the same service-role client the app uses server-side.
  const context = () => ({
    supabase: getTestSupabaseClient(),
    currentProfile: {
      id: profileId,
      email: `invited-${profileId}@test.com`,
    },
  })

  beforeEach(async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Closed event",
      event_status: "Registration Closed",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    eventId = event.id

    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `invited-${randomUUID()}@test.com`,
      full_name: "Invited Person",
    })
    profileId = profile.id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("refuses an application when the event is closed and there is no invite", async () => {
    const result = await applyToEvent(answers(), context())

    expect(result.success).toBe(false)
  })

  it("accepts the application when a valid invite exists", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    const result = await applyToEvent(answers(), context())

    expect(result.success).toBe(true)
  })

  it("refuses when the invite was revoked", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
      revoked_at: new Date().toISOString(),
    })

    const result = await applyToEvent(answers(), context())

    expect(result.success).toBe(false)
  })

  it("stamps the invite as used once the application is in", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    await applyToEvent(answers(), context())

    const invite = await kysely
      .selectFrom("event_invites")
      .selectAll()
      .where("event_id", "=", eventId)
      .where("profile_id", "=", profileId)
      .executeTakeFirstOrThrow()

    expect(invite.used_at).not.toBeNull()
  })
})
```

Add the import for the supabase test client at the top, alongside the fixtures:

```ts
import { getTestSupabaseClient } from "~/test/db-test-utils"
```

Read `app/business/participant/apply-to-event.server.test.ts:100` before
writing this — it already builds a context for `applyToEvent`, and the shape
there is the one to copy if the sketch above does not typecheck against
`userContextSchema`.

- [ ] **Step 2: Run it and watch it fail**

Check the lock, then run: `pnpm test:integration -- apply-to-event-invite`
Expected: FAIL — the "accepts the application when a valid invite exists" case
fails with the registration-closed error. This is a behavioural failure, which
is the point: the other three cases already pass.

- [ ] **Step 3: Change the gate**

In `app/business/participant/apply-to-event.server.ts`, add the import:

```ts
import {
  findValidInvite,
  markInviteUsed,
} from "./event-invite.server"
```

Replace lines 32-34:

```ts
  if (event.event_status === "Registration Closed") {
    throw new Error(participantCopy.application.registrationClosed)
  }
```

with:

```ts
  // A closed event still lets in whoever holds an invite for it. The invite is
  // read against the signed-in profile, so the link is worthless to anybody
  // else who is handed it.
  const invite =
    event.event_status === "Registration Closed"
      ? await findValidInvite(eventId, profileId)
      : undefined

  if (event.event_status === "Registration Closed" && !invite) {
    throw new Error(participantCopy.application.registrationClosed)
  }
```

Then, after the `if (error) { ... }` block that guards the upsert and before
the email is sent, add:

```ts
  if (invite) await markInviteUsed(eventId, profileId)
```

- [ ] **Step 4: Run the tests again**

Run: `pnpm test:integration -- apply-to-event-invite`
Expected: PASS, 4 tests.

Then run the existing suite for this module, which must not have moved:

Run: `pnpm test:unit -- apply-to-event`
Expected: PASS, including `apply-to-event.server.test.ts:212` — "should return
error when event status is 'Registration Closed'".

- [ ] **Step 5: Commit**

```bash
git add app/business/participant/apply-to-event.server.ts app/business/participant/apply-to-event-invite.integration.test.ts
git commit -m "feat(invites): let an invited profile past a closed event

The check is against the database and the signed-in profile, never
against anything the browser sends."
```

---

### Task 5: The admin's side of an invite

**Files:**
- Create: `app/business/admin/event-invites.server.ts`
- Test: `app/business/admin/event-invites.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestEvent, createTestProfile } from "~/test/db-test-utils"
import {
  createInvite,
  listInvitesForEvent,
  revokeInvite,
} from "./event-invites.server"

describe("event invites, from the admin's side", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let eventId: string
  let profileId: string

  beforeEach(async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Invite admin test event",
      event_status: "Registration Closed",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    eventId = event.id

    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `guest-${randomUUID()}@test.com`,
      full_name: "Guest Person",
    })
    profileId = profile.id
  })

  afterEach(async () => {
    await kysely.deleteFrom("event_invites").where("event_id", "=", eventId).execute()
    await cleanupAfterTest(tracker, kysely)
  })

  it("creates an invite with a token", async () => {
    const invite = await createInvite({ eventId, profileId })

    expect(invite.token).toEqual(expect.any(String))
    expect(invite.token.length).toBeGreaterThanOrEqual(20)
    expect(invite.event_id).toBe(eventId)
    expect(invite.profile_id).toBe(profileId)
  })

  it("returns the existing invite instead of minting a rival", async () => {
    const first = await createInvite({ eventId, profileId })
    const second = await createInvite({ eventId, profileId })

    expect(second.id).toBe(first.id)
    expect(second.token).toBe(first.token)
  })

  it("brings a revoked invite back to life rather than colliding with it", async () => {
    const first = await createInvite({ eventId, profileId })
    await revokeInvite(first.id)

    const second = await createInvite({ eventId, profileId })

    expect(second.id).toBe(first.id)
    expect(second.revoked_at).toBeNull()
    expect(second.token).not.toBe(first.token)
  })

  it("revokes an invite", async () => {
    const invite = await createInvite({ eventId, profileId })

    await revokeInvite(invite.id)

    const [listed] = await listInvitesForEvent(eventId)
    expect(listed.revoked_at).not.toBeNull()
  })

  it("lists the event's invites with the invited person's name", async () => {
    await createInvite({ eventId, profileId })

    const invites = await listInvitesForEvent(eventId)

    expect(invites).toHaveLength(1)
    expect(invites[0]).toMatchObject({
      profile_id: profileId,
      full_name: "Guest Person",
    })
  })
})
```

Note the extra `deleteFrom("event_invites")` in `afterEach`: rows created by
`createInvite` are not tracked, because the function under test is what created
them.

- [ ] **Step 2: Run it and watch it fail**

Check the lock, then run: `pnpm test:integration -- event-invites`
Expected: FAIL — no export named `createInvite`.

- [ ] **Step 3: Write the implementation**

```ts
import { randomBytes } from "node:crypto"
import { kyselyDb } from "~/kysely-db"

const newToken = () => randomBytes(24).toString("base64url")

/**
 * One invite per (event, profile). Asking twice hands back the same link
 * rather than a rival the admin might send by mistake -- except after a
 * revocation, where the row is reused with a fresh token so the link that was
 * called off stays dead.
 */
export async function createInvite({
  eventId,
  profileId,
}: {
  eventId: string
  profileId: string
}) {
  const existing = await kyselyDb
    .selectFrom("event_invites")
    .selectAll()
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .executeTakeFirst()

  if (existing && !existing.revoked_at) return existing

  if (existing) {
    return await kyselyDb
      .updateTable("event_invites")
      .set({ token: newToken(), revoked_at: null, used_at: null })
      .where("id", "=", existing.id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  return await kyselyDb
    .insertInto("event_invites")
    .values({ event_id: eventId, profile_id: profileId, token: newToken() })
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function revokeInvite(inviteId: string) {
  await kyselyDb
    .updateTable("event_invites")
    .set({ revoked_at: new Date().toISOString() })
    .where("id", "=", inviteId)
    .execute()
}

export async function listInvitesForEvent(eventId: string) {
  return await kyselyDb
    .selectFrom("event_invites")
    .innerJoin("profiles", "profiles.id", "event_invites.profile_id")
    .select([
      "event_invites.id",
      "event_invites.event_id",
      "event_invites.profile_id",
      "event_invites.token",
      "event_invites.created_at",
      "event_invites.used_at",
      "event_invites.revoked_at",
      "profiles.full_name",
      "profiles.social_name",
    ])
    .where("event_invites.event_id", "=", eventId)
    .orderBy("event_invites.created_at", "desc")
    .execute()
}

export type EventInviteRow = Awaited<
  ReturnType<typeof listInvitesForEvent>
>[number]
```

- [ ] **Step 4: Run the test again**

Run: `pnpm test:integration -- event-invites`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/business/admin/event-invites.server.ts app/business/admin/event-invites.integration.test.ts
git commit -m "feat(invites): create, revoke and list invites

Asking twice for the same person returns the link that already exists.
Revoking and asking again reuses the row with a fresh token, so the
called-off link stays dead."
```

---

### Task 6: The modal's search

**Files:**
- Create: `app/business/admin/search-profiles.server.ts`
- Test: `app/business/admin/search-profiles.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"
import { searchProfilesForInvite } from "./search-profiles.server"

describe("searching for someone to invite", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let eventId: string
  let marker: string

  beforeEach(async () => {
    marker = randomUUID().slice(0, 8)

    const event = await createTestEvent(tracker, kysely, {
      title: "Search test event",
      event_status: "Registration Closed",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    eventId = event.id

    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `joao-${marker}@test.com`,
      full_name: `João Gonçalves ${marker}`,
      social_name: `Joana ${marker}`,
      phone: 11987654321,
    })
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("matches a full name", async () => {
    const results = await searchProfilesForInvite(eventId, `Gonçalves ${marker}`)

    expect(results).toHaveLength(1)
  })

  it("matches a name typed without its accents", async () => {
    const results = await searchProfilesForInvite(eventId, `Goncalves ${marker}`)

    expect(results).toHaveLength(1)
  })

  it("matches a social name", async () => {
    const results = await searchProfilesForInvite(eventId, `Joana ${marker}`)

    expect(results).toHaveLength(1)
  })

  it("matches an email", async () => {
    const results = await searchProfilesForInvite(eventId, `joao-${marker}@test.com`)

    expect(results).toHaveLength(1)
  })

  it("matches a phone typed with punctuation", async () => {
    const results = await searchProfilesForInvite(eventId, "(11) 98765-4321")

    expect(results.some((row) => row.phone === 11987654321)).toBe(true)
  })

  it("says who is already registered for the event", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `already-${marker}@test.com`,
      full_name: `Already In ${marker}`,
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: eventId,
      is_user_applied: true,
    })

    const results = await searchProfilesForInvite(eventId, `Already In ${marker}`)

    expect(results[0].is_participant).toBe(true)
  })

  it("returns at most five rows", async () => {
    for (let index = 0; index < 7; index += 1) {
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `many-${index}-${marker}@test.com`,
        full_name: `Many People ${marker} ${index}`,
      })
    }

    const results = await searchProfilesForInvite(eventId, `Many People ${marker}`)

    expect(results).toHaveLength(5)
  })

  it("returns nothing for a blank term", async () => {
    const results = await searchProfilesForInvite(eventId, "   ")

    expect(results).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Check the lock, then run: `pnpm test:integration -- search-profiles`
Expected: FAIL — no export named `searchProfilesForInvite`.

- [ ] **Step 3: Write the implementation**

```ts
import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"

const RESULT_LIMIT = 5

/**
 * One field, four columns. `profiles.phone` is a number, so a term that is all
 * digits once its punctuation is stripped is compared as a number's text and
 * everything else is matched as a name, a social name or an email.
 *
 * `unaccent` is what lets "Goncalves" find "Gonçalves" -- the admin types what
 * they heard, not what the person registered.
 */
export async function searchProfilesForInvite(eventId: string, term: string) {
  const trimmed = term.trim()
  if (!trimmed) return []

  const like = `%${trimmed}%`
  const digits = trimmed.replace(/\D/g, "")

  return await kyselyDb
    .selectFrom("profiles")
    .select((eb) => [
      "profiles.id",
      "profiles.full_name",
      "profiles.social_name",
      "profiles.email",
      "profiles.phone",
      eb
        .exists(
          eb
            .selectFrom("event_participants")
            .select("event_participants.id")
            .whereRef("event_participants.profile_id", "=", "profiles.id")
            .where("event_participants.event_id", "=", eventId),
        )
        .as("is_participant"),
    ])
    .where((eb) =>
      eb.or([
        sql<boolean>`extensions.unaccent(coalesce(profiles.full_name, '')) ilike extensions.unaccent(${like})`,
        sql<boolean>`extensions.unaccent(coalesce(profiles.social_name, '')) ilike extensions.unaccent(${like})`,
        eb("profiles.email", "ilike", like),
        ...(digits
          ? [sql<boolean>`profiles.phone::text like ${`%${digits}%`}`]
          : []),
      ]),
    )
    .orderBy("profiles.full_name", "asc")
    .limit(RESULT_LIMIT)
    .execute()
}

export type InviteSearchResult = Awaited<
  ReturnType<typeof searchProfilesForInvite>
>[number]
```

- [ ] **Step 4: Run the test again**

Run: `pnpm test:integration -- search-profiles`
Expected: PASS, 8 tests.

If the `unaccent` calls fail with "schema extensions does not exist" or
"function does not exist", the extension landed somewhere else — check with
`supabase migration up` output and adjust the schema qualifier in the two
`sql` fragments. Do not drop the accent handling.

- [ ] **Step 5: Commit**

```bash
git add app/business/admin/search-profiles.server.ts app/business/admin/search-profiles.integration.test.ts
git commit -m "feat(invites): search people for an invite

One field over name, social name, email and phone, five rows at most.
Accents are folded, and a phone is compared by its digits, because the
admin types what they heard."
```

---

### Task 7: The copy

**Files:**
- Create: `app/copy/admin/invites.ts`
- Modify: `app/copy/events.ts`

- [ ] **Step 1: Write the admin copy module**

```ts
export const adminInvitesCopy = {
  trigger: "Convidar participante",
  modal: {
    title: "Convidar participante",
    description:
      "Gere um link para uma pessoa específica entrar num evento com inscrições encerradas. O link só funciona para ela.",
    searchLabel: "Buscar pessoa",
    searchPlaceholder: "Nome, nome social, e-mail ou telefone",
    searchHelp:
      "Busque por nome, nome social, e-mail ou telefone. No telefone, só os números importam — pode digitar com ou sem parênteses e traço.",
    noResults: "Ninguém encontrado com esse termo.",
    invite: "Convidar",
    alreadyParticipant: "Já participante",
    linkLabel: "Link do convite",
    copy: "Copiar link",
    copied: "Link copiado",
    revoke: "Revogar",
    invitesTitle: "Convites deste evento",
    noInvites: "Nenhum convite gerado ainda.",
    participantsTitle: "Já inscritas",
    noParticipants: "Ninguém inscrito ainda.",
    status: {
      created: "Gerado",
      used: "Usado",
      revoked: "Revogado",
    },
    failed: "Não foi possível gerar o convite. Tente de novo.",
    revokeFailed: "Não foi possível revogar o convite. Tente de novo.",
  },
} as const
```

- [ ] **Step 2: Add the participant-facing copy**

At the end of `app/copy/events.ts`, alongside the existing exports:

```ts
export const inviteCopy = {
  invalid: {
    title: "Convite inválido",
    body: `Esse convite não existe mais ou foi cancelado.

Se você acha que é engano, fale com a organização.`,
  },
  wrongPerson: {
    title: "Esse convite não é seu",
    body: `Esse convite foi feito para outra pessoa e só funciona na conta dela.

Se ele era para você, entre com a conta que recebeu o convite.`,
  },
  backToDashboard: "Voltar para o painel",
} as const
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/copy
git commit -m "feat(invites): add the invite copy"
```

---

### Task 8: `redirect_to` validation

A value that arrives from the browser and decides where a freshly signed-in
person lands is an open redirect waiting to happen. It gets its own tested
helper before anything uses it.

**Files:**
- Create: `app/lib/helpers/safe-redirect.ts`
- Test: `app/lib/helpers/safe-redirect.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { safeRedirect } from "./safe-redirect"

const FALLBACK = "/dashboard"

describe("safeRedirect", () => {
  it("keeps a same-site path", () => {
    expect(safeRedirect("/convite/abc", FALLBACK)).toBe("/convite/abc")
  })

  it("keeps a path with a query string", () => {
    expect(safeRedirect("/dashboard/1/regras?q=2", FALLBACK)).toBe(
      "/dashboard/1/regras?q=2",
    )
  })

  it.each([
    ["nothing at all", undefined],
    ["an empty string", ""],
    ["only whitespace", "   "],
    ["a protocol-relative URL", "//evil.example/phishing"],
    ["a backslash-escaped host", "/\\evil.example"],
    ["an absolute http URL", "http://evil.example"],
    ["an absolute https URL", "https://evil.example"],
    ["our own host spelled out", "https://positiv.com.br/dashboard"],
    ["a javascript URL", "javascript:alert(1)"],
    ["a data URL", "data:text/html,<script>alert(1)</script>"],
    ["a bare path with no leading slash", "dashboard"],
    ["a path with a newline in it", "/dashboard\n/evil"],
  ])("refuses %s", (_label, value) => {
    expect(safeRedirect(value, FALLBACK)).toBe(FALLBACK)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:unit -- safe-redirect`
Expected: FAIL — no export named `safeRedirect`.

- [ ] **Step 3: Write the implementation**

```ts
/**
 * Where to send someone after a sign-in, when the browser is the one asking.
 *
 * Taken at face value this is an open redirect: `/entrar?redirect_to=https://evil.example`
 * would have our own domain deposit a freshly signed-in person on somebody
 * else's site. Only a same-site absolute path survives -- one leading slash, no
 * scheme, no host, nothing that a browser would read as either.
 */
export function safeRedirect(
  to: string | null | undefined,
  fallback: string,
): string {
  if (typeof to !== "string") return fallback

  const trimmed = to.trim()

  if (!trimmed.startsWith("/")) return fallback
  if (trimmed.startsWith("//")) return fallback
  if (trimmed.startsWith("/\\")) return fallback
  if (/[\n\r\t]/.test(trimmed)) return fallback

  return trimmed
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm test:unit -- safe-redirect`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add app/lib/helpers/safe-redirect.ts app/lib/helpers/safe-redirect.test.ts
git commit -m "feat(auth): validate a client-supplied redirect target

A redirect_to taken at face value is an open redirect: our own domain
would deposit a signed-in person on somebody else's site. Only a
same-site absolute path survives."
```

---

### Task 9: `signIn` honours `redirect_to`

**Files:**
- Modify: `app/business/auth/sign-in.server.ts`
- Test: `app/business/auth/sign-in.server.test.ts`

- [ ] **Step 1: Write the failing test**

Read `app/business/auth/sign-in.server.test.ts` first — it already builds a
mocked supabase context, and these cases extend the existing `describe` rather
than replacing it. Append:

```ts
  it("sends the person where they were going", async () => {
    const result = await signIn({
      answers: { email: "user@test.com", password: "password", redirectTo: "/convite/abc" },
      context,
    })

    expect(result).toEqual({ ok: true, redirectTo: "/convite/abc" })
  })

  it("ignores a redirect that points off-site", async () => {
    const result = await signIn({
      answers: { email: "user@test.com", password: "password", redirectTo: "https://evil.example" },
      context,
    })

    expect(result).toEqual({ ok: true, redirectTo: DASHBOARD })
  })
```

Match `context`, the mocks, and the `DASHBOARD` import to what the file at
`sign-in.server.test.ts:73` already sets up.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:unit -- sign-in`
Expected: FAIL — `redirectTo` comes back as `/dashboard` in the first case.

- [ ] **Step 3: Write the implementation**

In `app/business/auth/sign-in.server.ts`, add the import:

```ts
import { safeRedirect } from "~/lib/helpers/safe-redirect"
```

`loginSchema` in `app/business/common.ts` drives the parse, and an unknown key
is dropped, so read the destination from the raw answers rather than from the
parsed value. Replace the return at line 69-72:

```ts
  return {
    ok: true,
    redirectTo: profile?.is_admin ? ADMIN_DASHBOARD : DASHBOARD,
  }
```

with:

```ts
  const home = profile?.is_admin ? ADMIN_DASHBOARD : DASHBOARD

  return {
    ok: true,
    redirectTo: safeRedirect(
      typeof answers.redirectTo === "string" ? answers.redirectTo : null,
      home,
    ),
  }
```

- [ ] **Step 4: Run the test again**

Run: `pnpm test:unit -- sign-in`
Expected: PASS, including the two existing cases at `sign-in.server.test.ts:73` and `:81`.

- [ ] **Step 5: Commit**

```bash
git add app/business/auth/sign-in.server.ts app/business/auth/sign-in.server.test.ts
git commit -m "feat(auth): sign in returns to where the person was going

Validated against safeRedirect, so an off-site target falls back to the
person's own home."
```

---

### Task 10: The login page carries `redirect_to`

**Files:**
- Modify: `app/pages/auth/login-page.tsx`
- Modify: `app/pages/api/auth/login.ts`
- Test: `app/pages/auth/login-page.test.tsx` (create if absent)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithRouter } from "~/test/test-utils"
import LoginPage from "./login-page"

describe("the login page", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, redirectTo: "/convite/abc" }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it("sends the redirect target it was opened with", async () => {
    renderWithRouter(<LoginPage />, {
      initialEntries: ["/entrar?redirect_to=/convite/abc"],
    })

    await userEvent.type(screen.getByLabelText(/e-?mail/i), "user@test.com")
    await userEvent.type(screen.getByLabelText(/senha/i), "password")
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body)).toMatchObject({
      redirectTo: "/convite/abc",
    })
  })
})
```

Read `app/test/test-utils.tsx` first and use whatever render helper it exports —
if it has no `initialEntries` option, follow the pattern the other page tests in
`app/pages/` use to mount a route with a query string. Match the field labels to
`buildLoginQuestions`.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:unit -- login-page`
Expected: FAIL — the posted body has no `redirectTo`.

- [ ] **Step 3: Write the implementation**

In `app/pages/auth/login-page.tsx`, add `useSearchParams` to the
`react-router` import, then inside `LoginPage`:

```tsx
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirect_to")
```

and send it with the answers:

```tsx
  const commit = useCallback(
    async (answers: Answers): Promise<SignInResult> => {
      const response = await fetch(LOGIN_COMMIT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, redirectTo }),
      })

      const result = (await response.json()) as SignInResult
      if (result.ok) destination.current = result.redirectTo

      return result
    },
    [redirectTo],
  )
```

The page's own loader also sends an already-signed-in visitor home; it should
respect the same parameter. Add the import:

```tsx
import { safeRedirect } from "~/lib/helpers/safe-redirect"
```

and in the loader, replace:

```tsx
    const targetPath = currentProfile?.is_admin ? ADMIN_DASHBOARD : DASHBOARD
```

with:

```tsx
    const home = currentProfile?.is_admin ? ADMIN_DASHBOARD : DASHBOARD
    const targetPath = safeRedirect(
      new URL(request.url).searchParams.get("redirect_to"),
      home,
    )
```

`app/pages/api/auth/login.ts` needs no change: it already forwards the whole
parsed body to `signIn` as `answers`. Confirm this by reading it, and if it
narrows the body, widen it to pass `redirectTo` through.

- [ ] **Step 4: Run the test again**

Run: `pnpm test:unit -- login-page`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pages/auth/login-page.tsx app/pages/auth/login-page.test.tsx
git commit -m "feat(auth): the login page carries redirect_to through"
```

---

### Task 11: The guard names the destination

**Files:**
- Modify: `app/business/auth/auth.server.ts:150-159`
- Test: `app/business/auth/auth.server.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the existing `describe` for `getUserContext` in
`app/business/auth/auth.server.test.ts`:

```ts
  it("names where the signed-out visitor was going", async () => {
    const request = new Request("http://localhost:5173/convite/abc")

    const thrown = await getUserContext(request, {}).catch((error) => error)

    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).headers.get("Location")).toContain(
      "redirect_to=%2Fconvite%2Fabc",
    )
  })
```

Match the mocking of `getContext` to what the file already does for the
signed-out case.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:unit -- auth.server`
Expected: FAIL — `Location` is `/entrar` with no query.

- [ ] **Step 3: Write the implementation**

In `app/business/auth/auth.server.ts`, replace lines 155-157:

```ts
  if (!currentUser) {
    throw await redirectWithError(LOGIN, errorsCopy.auth.loginRequired)
  }
```

with:

```ts
  if (!currentUser) {
    // Where they were going, so the login can put them back. Any private link
    // opened while signed out used to end at the dashboard with no explanation.
    const url = new URL(request.url)
    const destination = `${url.pathname}${url.search}`
    const login = `${LOGIN}?redirect_to=${encodeURIComponent(destination)}`

    throw await redirectWithError(login, errorsCopy.auth.loginRequired)
  }
```

- [ ] **Step 4: Run the test again**

Run: `pnpm test:unit -- auth.server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/business/auth/auth.server.ts app/business/auth/auth.server.test.ts
git commit -m "feat(auth): the guard remembers where the visitor was going"
```

---

### Task 12: The existing redirect E2E expectation

`e2e/tests/unauthenticated/auth-redirect.spec.ts:18` asserts
`toHaveURL('/entrar')` exactly. Task 11 makes the URL carry a query string, so
that assertion is now wrong. It gets fixed here rather than discovered during
the single E2E run at the end.

**Files:**
- Modify: `e2e/tests/unauthenticated/auth-redirect.spec.ts`

- [ ] **Step 1: Update the assertion**

Replace:

```ts
    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL('/entrar')
    }
```

with:

```ts
    for (const route of protectedRoutes) {
      await page.goto(route)
      // The login now carries where the visitor was going, so it can put them
      // back after they sign in.
      await expect(page).toHaveURL(
        new RegExp(`^.*/entrar\\?redirect_to=${encodeURIComponent(route)}`),
      )
    }
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: PASS. Do not run E2E here — it runs once, at Task 18.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/unauthenticated/auth-redirect.spec.ts
git commit -m "test(auth): the login URL now carries the destination"
```

---

### Task 13: Paths and routes

**Files:**
- Modify: `app/lib/paths.ts`
- Modify: `app/routes.ts`

- [ ] **Step 1: Add the paths**

In `app/lib/paths.ts`, in the PUBLIC block near `CODE_OF_CONDUCT`:

```ts
const INVITE = (token: string) => `/convite/${token}`
```

and in the ADMIN EVENTS block near `ADMIN_EVENT_PARTICIPANT_COMMIT`:

```ts
const ADMIN_EVENT_INVITE_COMMIT = "/api/admin/event-invite"
```

Register them in the exported object: `INVITE` under `root`, and
`ADMIN_EVENT_INVITE_COMMIT` under `admin.events`.

- [ ] **Step 2: Add the routes**

In `app/routes.ts`, with the other API routes:

```ts
  route("/api/admin/event-invite", "pages/api/admin/event-invite.ts"),
```

and in the PUBLIC block, after `route("/auth/confirm", ...)`:

```ts
  route("/convite/:token", "pages/invite/invite-page.tsx"),
```

The route files do not exist yet, so this task's verification is deferred: it
compiles only once Tasks 14 and 16 land. Commit it with Task 14 rather than on
its own.

- [ ] **Step 3: No commit here**

The paths and the routes ride along with the files they point at.

---

### Task 14: The invite endpoint

**Files:**
- Create: `app/pages/api/admin/event-invite.ts`

- [ ] **Step 1: Write the failing test**

Create `app/pages/api/admin/event-invite.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest"

const getAdminContext = vi.fn()
vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: (...args: unknown[]) => getAdminContext(...args),
}))

const createInvite = vi.fn()
const revokeInvite = vi.fn()
const listInvitesForEvent = vi.fn()
vi.mock("~/business/admin/event-invites.server", () => ({
  createInvite: (...args: unknown[]) => createInvite(...args),
  revokeInvite: (...args: unknown[]) => revokeInvite(...args),
  listInvitesForEvent: (...args: unknown[]) => listInvitesForEvent(...args),
}))

const searchProfilesForInvite = vi.fn()
vi.mock("~/business/admin/search-profiles.server", () => ({
  searchProfilesForInvite: (...args: unknown[]) =>
    searchProfilesForInvite(...args),
}))

import { action } from "./event-invite"

const post = (body: unknown) =>
  action({
    request: new Request("http://localhost/api/admin/event-invite", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    params: {},
    context: {} as never,
  })

describe("the invite endpoint", () => {
  beforeEach(() => {
    getAdminContext.mockResolvedValue({})
    createInvite.mockResolvedValue({ id: "i1", token: "tok" })
    listInvitesForEvent.mockResolvedValue([])
    searchProfilesForInvite.mockResolvedValue([])
  })

  it("creates an invite", async () => {
    const response = await post({
      intent: "create",
      eventId: "e1",
      profileId: "p1",
    })

    expect(createInvite).toHaveBeenCalledWith({
      eventId: "e1",
      profileId: "p1",
    })
    expect(response.status).toBe(200)
  })

  it("revokes an invite", async () => {
    const response = await post({ intent: "revoke", eventId: "e1", inviteId: "i1" })

    expect(revokeInvite).toHaveBeenCalledWith("i1")
    expect(response.status).toBe(200)
  })

  it("searches", async () => {
    await post({ intent: "search", eventId: "e1", term: "maria" })

    expect(searchProfilesForInvite).toHaveBeenCalledWith("e1", "maria")
  })

  it("refuses a body it cannot read", async () => {
    const response = await action({
      request: new Request("http://localhost/api/admin/event-invite", {
        method: "POST",
        body: "not json",
      }),
      params: {},
      context: {} as never,
    })

    expect(response.status).toBe(400)
  })

  it("refuses an unknown intent", async () => {
    const response = await post({ intent: "nonsense", eventId: "e1" })

    expect(response.status).toBe(422)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:unit -- event-invite`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the implementation**

```ts
import type { ActionFunctionArgs } from "react-router"
import { getAdminContext } from "~/business/admin/admin.server"
import {
  createInvite,
  listInvitesForEvent,
  revokeInvite,
} from "~/business/admin/event-invites.server"
import { searchProfilesForInvite } from "~/business/admin/search-profiles.server"
import { zod } from "~/lib/helpers/zod"

/**
 * A route of its own rather than the page's action, for the reason the other
 * admin endpoints have one: the modal asks and waits for an answer, and a POST
 * to a page route comes back as rendered HTML.
 */
const bodySchema = zod.discriminatedUnion("intent", [
  zod.object({
    intent: zod.literal("search"),
    eventId: zod.string().min(1),
    term: zod.string(),
  }),
  zod.object({
    intent: zod.literal("create"),
    eventId: zod.string().min(1),
    profileId: zod.string().min(1),
  }),
  zod.object({
    intent: zod.literal("revoke"),
    eventId: zod.string().min(1),
    inviteId: zod.string().min(1),
  }),
])

export async function action({ request, params }: ActionFunctionArgs) {
  await getAdminContext(request, params)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return Response.json({ ok: false }, { status: 422 })

  const values = parsed.data

  if (values.intent === "search") {
    const results = await searchProfilesForInvite(values.eventId, values.term)
    return Response.json({ ok: true, results })
  }

  if (values.intent === "create") {
    await createInvite({
      eventId: values.eventId,
      profileId: values.profileId,
    })
  }

  if (values.intent === "revoke") {
    await revokeInvite(values.inviteId)
  }

  const invites = await listInvitesForEvent(values.eventId)
  return Response.json({ ok: true, invites })
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm test:unit -- event-invite`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

Include the paths and routes from Task 13 — this is what makes them compile.

```bash
git add app/pages/api/admin/event-invite.ts app/pages/api/admin/event-invite.test.ts app/lib/paths.ts app/routes.ts
git commit -m "feat(invites): add the admin invite endpoint

Search, create and revoke behind the admin guard, answering with the
event's invites so the modal never has to ask twice."
```

Note: `app/routes.ts` now names `pages/invite/invite-page.tsx`, which arrives in
Task 16. If the build complains before then, add that route line in Task 16
instead and keep only the API route here.

---

### Task 15: The admin modal

**Files:**
- Create: `app/components/organisms/event-invite-modal/event-invite-modal.tsx`
- Test: `app/components/organisms/event-invite-modal/event-invite-modal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { render } from "~/test/test-utils"
import { EventInviteModal } from "./event-invite-modal"

const eventId = "e1"

const found = (rows: unknown[]) => ({
  ok: true,
  json: async () => ({ ok: true, results: rows }),
})

describe("the invite modal", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it("shows what the search found", async () => {
    fetchMock.mockResolvedValue(
      found([
        {
          id: "p1",
          full_name: "Maria Silva",
          social_name: null,
          email: "maria@test.com",
          phone: null,
          is_participant: false,
        },
      ]),
    )

    render(
      <EventInviteModal open onOpenChange={() => {}} eventId={eventId} invites={[]} participants={[]} />,
    )

    await userEvent.type(screen.getByLabelText(/buscar pessoa/i), "maria")

    expect(await screen.findByText("Maria Silva")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /convidar/i })).toBeEnabled()
  })

  it("will not invite someone already registered", async () => {
    fetchMock.mockResolvedValue(
      found([
        {
          id: "p2",
          full_name: "Já Inscrita",
          social_name: null,
          email: "ja@test.com",
          phone: null,
          is_participant: true,
        },
      ]),
    )

    render(
      <EventInviteModal open onOpenChange={() => {}} eventId={eventId} invites={[]} participants={[]} />,
    )

    await userEvent.type(screen.getByLabelText(/buscar pessoa/i), "ja")

    expect(
      await screen.findByRole("button", { name: /já participante/i }),
    ).toBeDisabled()
  })

  it("asks the endpoint to create the invite", async () => {
    fetchMock.mockResolvedValue(
      found([
        {
          id: "p1",
          full_name: "Maria Silva",
          social_name: null,
          email: "maria@test.com",
          phone: null,
          is_participant: false,
        },
      ]),
    )

    render(
      <EventInviteModal open onOpenChange={() => {}} eventId={eventId} invites={[]} participants={[]} />,
    )

    await userEvent.type(screen.getByLabelText(/buscar pessoa/i), "maria")
    await screen.findByText("Maria Silva")

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, invites: [] }),
    })

    await userEvent.click(screen.getByRole("button", { name: /^convidar$/i }))

    await waitFor(() => {
      const bodies = fetchMock.mock.calls.map(([, options]) =>
        JSON.parse((options as RequestInit).body as string),
      )
      expect(bodies).toContainEqual({
        intent: "create",
        eventId,
        profileId: "p1",
      })
    })
  })

  it("shows the link of an invite that already exists", () => {
    render(
      <EventInviteModal
        open
        onOpenChange={() => {}}
        eventId={eventId}
        invites={[
          {
            id: "i1",
            event_id: eventId,
            profile_id: "p1",
            token: "tok123",
            created_at: new Date().toISOString(),
            used_at: null,
            revoked_at: null,
            full_name: "Maria Silva",
            social_name: null,
          },
        ]}
        participants={[]}
      />,
    )

    expect(screen.getByDisplayValue(/\/convite\/tok123$/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /revogar/i })).toBeInTheDocument()
  })

  it("lists who is already registered", () => {
    render(
      <EventInviteModal
        open
        onOpenChange={() => {}}
        eventId={eventId}
        invites={[]}
        participants={[{ id: "p9", full_name: "Já Dentro", social_name: null }]}
      />,
    )

    expect(screen.getByText("Já Dentro")).toBeInTheDocument()
  })
})
```

Read `app/test/test-utils.tsx` and use the render helper it exports. Read
`app/components/organisms/payment/manage-payment-modal.test.tsx` for how a
modal in this codebase is mounted in a test.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:unit -- event-invite-modal`
Expected: FAIL — the component does not exist.

- [ ] **Step 3: Write the implementation**

Model the shell on `app/components/organisms/payment/manage-payment-modal.tsx`:
`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`,
and the ShadcN `Input`, `Label`, `Table` primitives.

```tsx
import { useEffect, useState, type FC } from "react"
import type { EventInviteRow } from "~/business/admin/event-invites.server"
import type { InviteSearchResult } from "~/business/admin/search-profiles.server"
import { Button } from "~/components/atoms/button/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { adminInvitesCopy } from "~/copy/admin/invites"
import paths from "~/lib/paths"

const { modal } = adminInvitesCopy
const {
  root: { INVITE },
  admin: {
    events: { ADMIN_EVENT_INVITE_COMMIT },
  },
} = paths

export type InviteModalParticipant = {
  id: string
  full_name: string | null
  social_name: string | null
}

export type EventInviteModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  invites: EventInviteRow[]
  participants: InviteModalParticipant[]
}

const displayName = (person: {
  full_name: string | null
  social_name: string | null
}) => person.social_name || person.full_name || ""

const inviteUrl = (token: string) =>
  typeof window === "undefined"
    ? INVITE(token)
    : `${window.location.origin}${INVITE(token)}`

const statusOf = (invite: EventInviteRow) => {
  if (invite.revoked_at) return modal.status.revoked
  if (invite.used_at) return modal.status.used
  return modal.status.created
}

export const EventInviteModal: FC<EventInviteModalProps> = ({
  open,
  onOpenChange,
  eventId,
  invites,
  participants,
}) => {
  const [term, setTerm] = useState("")
  const [results, setResults] = useState<InviteSearchResult[]>([])
  const [currentInvites, setCurrentInvites] = useState(invites)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => setCurrentInvites(invites), [invites])

  // The admin types a name, not a query: waiting out the typing keeps one
  // request per pause instead of one per letter.
  useEffect(() => {
    if (!term.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      const response = await fetch(ADMIN_EVENT_INVITE_COMMIT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "search", eventId, term }),
      })
      const data = (await response.json()) as {
        ok: boolean
        results?: InviteSearchResult[]
      }
      setResults(data.results ?? [])
    }, 300)

    return () => clearTimeout(timer)
  }, [term, eventId])

  const send = async (body: Record<string, unknown>) => {
    setIsBusy(true)
    const response = await fetch(ADMIN_EVENT_INVITE_COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await response.json()) as {
      ok: boolean
      invites?: EventInviteRow[]
    }
    if (data.invites) setCurrentInvites(data.invites)
    setIsBusy(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modal.title}</DialogTitle>
          <DialogDescription>{modal.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-search">{modal.searchLabel}</Label>
          <Input
            id="invite-search"
            value={term}
            placeholder={modal.searchPlaceholder}
            onChange={(event) => setTerm(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">{modal.searchHelp}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {results.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-4">
              <span>{displayName(person)}</span>
              <Button
                size="sm"
                disabled={person.is_participant || isBusy}
                onClick={() =>
                  send({ intent: "create", eventId, profileId: person.id })
                }
              >
                {person.is_participant ? modal.alreadyParticipant : modal.invite}
              </Button>
            </li>
          ))}
        </ul>

        <section>
          <h3>{modal.invitesTitle}</h3>
          {currentInvites.length === 0 ? (
            <p>{modal.noInvites}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {currentInvites.map((invite) => (
                <li key={invite.id} className="flex flex-col gap-1">
                  <span>
                    {displayName(invite)} — {statusOf(invite)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={inviteUrl(invite.token)} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard.writeText(inviteUrl(invite.token))
                      }
                    >
                      {modal.copy}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={Boolean(invite.revoked_at) || isBusy}
                      onClick={() =>
                        send({ intent: "revoke", eventId, inviteId: invite.id })
                      }
                    >
                      {modal.revoke}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3>{modal.participantsTitle}</h3>
          {participants.length === 0 ? (
            <p>{modal.noParticipants}</p>
          ) : (
            <ul>
              {participants.map((person) => (
                <li key={person.id}>{displayName(person)}</li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm test:unit -- event-invite-modal`
Expected: PASS, 5 tests.

- [ ] **Step 5: Check the lint rule that guards JSX literals**

Run: `pnpm lint`
Expected: PASS. `react/jsx-no-literals` fails the build on a bare string
between JSX tags in a migrated directory. Every visible string above comes from
`adminInvitesCopy`; the `—` between name and status is punctuation and is
allowed, but if lint disagrees, move the whole line into a copy function.

- [ ] **Step 6: Commit**

```bash
git add app/components/organisms/event-invite-modal
git commit -m "feat(invites): add the invite modal

One search field over name, social name, email and phone. Someone
already registered shows a disabled button rather than disappearing, so
the admin can see why they cannot be invited."
```

---

### Task 16: The invite landing page

**Files:**
- Create: `app/pages/invite/invite-page.tsx`
- Test: `app/pages/invite/invite-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest"

const getContext = vi.fn()
vi.mock("~/business/auth/auth.server", () => ({
  getContext: (...args: unknown[]) => getContext(...args),
}))

const findValidInviteByToken = vi.fn()
vi.mock("~/business/participant/event-invite.server", () => ({
  findValidInviteByToken: (...args: unknown[]) =>
    findValidInviteByToken(...args),
}))

import { loader } from "./invite-page"

const call = (token: string) =>
  loader({
    request: new Request(`http://localhost:5173/convite/${token}`),
    params: { token },
    context: {} as never,
  } as never)

describe("the invite landing page", () => {
  beforeEach(() => {
    getContext.mockResolvedValue({ currentProfile: { id: "p1" } })
    findValidInviteByToken.mockResolvedValue({
      event_id: "e1",
      profile_id: "p1",
    })
  })

  it("sends the invited person to the event's rules", async () => {
    const result = await call("tok")

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get("Location")).toBe(
      "/dashboard/e1/regras",
    )
  })

  it("sends a signed-out visitor to the login, naming this page", async () => {
    getContext.mockResolvedValue({ currentProfile: null })

    const result = await call("tok")

    expect((result as Response).headers.get("Location")).toBe(
      "/entrar?redirect_to=%2Fconvite%2Ftok",
    )
  })

  it("tells someone else's visitor that the invite is not theirs", async () => {
    getContext.mockResolvedValue({ currentProfile: { id: "someone-else" } })

    const result = await call("tok")

    expect(result).toMatchObject({ outcome: "wrong-person" })
  })

  it("reports an unknown token as invalid", async () => {
    findValidInviteByToken.mockResolvedValue(undefined)

    const result = await call("tok")

    expect(result).toMatchObject({ outcome: "invalid" })
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:unit -- invite-page`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the implementation**

```tsx
import { redirect } from "react-router"
import { getContext } from "~/business/auth/auth.server"
import { findValidInviteByToken } from "~/business/participant/event-invite.server"
import { Copy } from "~/components/atoms/copy/copy"
import { Link } from "~/components/atoms/link/link"
import { inviteCopy } from "~/copy/events"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/invite-page"

const {
  auth: { LOGIN },
  dash: {
    DASHBOARD,
    events: { EVENT_RULES },
  },
  root: { INVITE },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.dashboard.title)
}

/**
 * Public on purpose: the person arrives from a link somebody sent them, and
 * more often than not they are signed out. The token names an (event, profile)
 * pair and nothing else -- it is the profile that authorizes, so a link handed
 * to the wrong person opens nothing and gives nothing away.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const token = params.token
  if (!token) return redirect(DASHBOARD)

  const { currentProfile } = await getContext(request, params)

  if (!currentProfile) {
    const destination = encodeURIComponent(INVITE(token))
    return redirect(`${LOGIN}?redirect_to=${destination}`)
  }

  const invite = await findValidInviteByToken(token)

  if (!invite) return { outcome: "invalid" as const }

  if (invite.profile_id !== currentProfile.id) {
    return { outcome: "wrong-person" as const }
  }

  return redirect(EVENT_RULES(invite.event_id))
}

const InvitePage = ({ loaderData }: Route.ComponentProps) => {
  const message =
    loaderData.outcome === "wrong-person"
      ? inviteCopy.wrongPerson
      : inviteCopy.invalid

  return (
    <div className="flex flex-col gap-4 my-12">
      <h1>{message.title}</h1>
      <Copy>{message.body}</Copy>
      <Link to={DASHBOARD}>{inviteCopy.backToDashboard}</Link>
    </div>
  )
}

export default InvitePage
```

If `app/routes.ts` does not yet carry the `/convite/:token` line from Task 13,
add it now — `./+types/invite-page` is generated from the route config, so the
types only exist once the route is registered.

- [ ] **Step 4: Run the test again**

Run: `pnpm test:unit -- invite-page`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/pages/invite app/routes.ts app/lib/paths.ts
git commit -m "feat(invites): add the invite landing page

Public, because the person arrives signed out more often than not. A
link opened by the wrong account says only that it is not theirs -- no
event, no name, no owner."
```

---

### Task 17: The dashboard card

**Files:**
- Modify: `app/pages/homepage/fetch/get-next-events.ts`
- Modify: `app/components/organisms/event-card/event-card-footer.tsx:158`
- Test: `app/components/organisms/event-card/event-card-footer.test.tsx` (create if absent)
- Test: `app/business/participant/event-invite.integration.test.ts` (extend)

- [ ] **Step 1: Write the failing card test**

```tsx
import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { render } from "~/test/test-utils"
import { EventCardFooter } from "./event-card-footer"
```

Read `event-card-footer.tsx` for the component's real name and props before
writing this, and mirror the props an existing card test passes. The two cases:

```tsx
describe("a closed event's footer", () => {
  it("offers nothing to someone without an invite", () => {
    render(<EventCardFooter {...closedEventProps} is_invited={false} />)

    expect(screen.getByRole("button", { name: /encerrada/i })).toBeDisabled()
  })

  it("offers the application to someone holding an invite", () => {
    render(<EventCardFooter {...closedEventProps} is_invited={true} />)

    expect(screen.getByRole("link", { name: /inscrever/i })).toBeInTheDocument()
  })
})
```

Build `closedEventProps` from the props the component already requires, with
`event_status: "Registration Closed"` and `is_applied: false`.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:unit -- event-card-footer`
Expected: FAIL — the invited case still renders the disabled button.

- [ ] **Step 3: Carry `is_invited` from the query**

In `app/pages/homepage/fetch/get-next-events.ts`, in the branch that already
joins `event_participants` for a known profile, add a second computed column
next to the existing `is_applied` case expression:

```ts
        .select((eb) =>
          eb
            .exists(
              eb
                .selectFrom("event_invites")
                .select("event_invites.id")
                .whereRef("event_invites.event_id", "=", "events.id")
                .where("event_invites.profile_id", "=", profileId)
                .where("event_invites.revoked_at", "is", null),
            )
            .as("is_invited"),
        )
```

The anonymous branch below it returns events with no profile to check against;
give it a literal so the shape matches:

```ts
    const data = await baseQuery
      .selectAll("events")
      .select((eb) => eb.val(false).as("is_invited"))
      .execute()
```

The declared return type is `Event[]`. Widen it to carry the two computed
columns rather than casting:

```ts
type EventWithApplication = Event & {
  is_applied?: boolean
  is_invited?: boolean
}

type GetNextEvents = Composable<
  (
    profileId: string | undefined,
    limit?: number,
    isHomepage?: boolean,
  ) => EventWithApplication[]
>
```

- [ ] **Step 4: Open the gate in the card**

In `app/components/organisms/event-card/event-card-footer.tsx`, add
`is_invited` to the component's props type (optional boolean), and replace the
block at line 158:

```tsx
  if (isClosed) {
    return (
      <Button data-testid={dataTestId} disabled={true}>
        {eventCardCopy.closed}
      </Button>
    )
  }
```

with:

```tsx
  // A closed event still opens for whoever holds an invite to it. What the
  // server does with the application is decided against the database; this only
  // stops the person from staring at a dead button.
  if (isClosed && !is_invited) {
    return (
      <Button data-testid={dataTestId} disabled={true}>
        {eventCardCopy.closed}
      </Button>
    )
  }

  if (isClosed && is_invited) {
    return (
      <Button
        data-testid={dataTestId}
        to={EVENT_VIEW(eventId)}
        linkProps={{ prefetch: prefetchStrategy }}
      >
        {eventCardCopy.apply}
      </Button>
    )
  }
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test:unit -- event-card-footer`
Expected: PASS.

Check the lock, then run: `pnpm test:integration -- get-next-events`
Expected: PASS if such a suite exists; if none does, run
`pnpm test:integration` for the whole suite and confirm nothing regressed.

- [ ] **Step 6: Commit**

```bash
git add app/pages/homepage/fetch/get-next-events.ts app/components/organisms/event-card/event-card-footer.tsx app/components/organisms/event-card/event-card-footer.test.tsx
git commit -m "feat(invites): show the application on an invited closed event

Read by profile from the database rather than from a cookie, so the link
opened on a phone and the form filled on a desktop are the same person."
```

---

### Task 18: Wire the modal into the event page

**Files:**
- Modify: `app/pages/admin/events/view-event-page/view-event-page.tsx`

- [ ] **Step 1: Load the invites**

In the loader, alongside the existing `Promise.all`, add the invite list. Add
the import:

```ts
import { listInvitesForEvent } from "~/business/admin/event-invites.server"
```

and extend the destructuring:

```ts
  const [participants, rejectedParticipants, paymentsByParticipant, invites] =
    await Promise.all([
      loadParticipants(eventId),
      getRejectedEventParticipants(eventId).catch((err) => {
        console.error("Failed to fetch rejected participants", err)
        return []
      }),
      getPaymentsForEvent(eventId),
      listInvitesForEvent(eventId),
    ])
```

Return `invites` alongside the rest.

- [ ] **Step 2: Render the button and the modal**

Add the imports:

```tsx
import { EventInviteModal } from "~/components/organisms/event-invite-modal/event-invite-modal"
import { adminInvitesCopy } from "~/copy/admin/invites"
```

Add the state next to the existing `managedParticipantId`:

```tsx
  const [isInviteOpen, setIsInviteOpen] = useState(false)
```

Then, immediately above `<GeneralData {...event} />` (line 230):

```tsx
      <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
        {adminInvitesCopy.trigger}
      </Button>

      <EventInviteModal
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        eventId={event.id}
        invites={invites}
        participants={participants.map((participant) => ({
          id: participant.id,
          full_name: participant.full_name,
          social_name: participant.social_name,
        }))}
      />
```

Import `Button` from `~/components/atoms/button/button` if the file does not
already have it, and add `invites` to the `loaderData` destructuring.

- [ ] **Step 3: See it in the browser**

Another agent may be holding port 5173. If `pnpm dev` reports the port busy,
say so and move on rather than killing whatever owns it.

Run: `pnpm dev`
Open an event whose status is "Registration Closed" at `/admin/eventos/<id>`,
press "Convidar participante", search for a person, generate a link, and open
that link in a private window.
Expected: the login asks for credentials, and after signing in as the invited
person the browser lands on that event's rules quiz.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pages/admin/events/view-event-page/view-event-page.tsx
git commit -m "feat(invites): open the invite modal from the event page"
```

---

### Task 19: The journey, end to end

Playwright picks the project by filename: `**/tests/authenticated/admin-*.spec.ts`
runs signed in as the admin, `user-*.spec.ts` as the participant
(`playwright.config.ts:89-110`). One file cannot be both, so the journey is two
files that stand on their own, plus the signed-out leg folded into the
unauthenticated spec Task 12 already touched.

**Files:**
- Create: `e2e/utils/invite-helpers.ts`
- Create: `e2e/tests/authenticated/admin-invite-closed-event.spec.ts`
- Create: `e2e/tests/authenticated/user-invited-closed-event.spec.ts`
- Modify: `e2e/tests/unauthenticated/auth-redirect.spec.ts`

- [ ] **Step 1: Write the helper**

```ts
import { randomBytes } from 'node:crypto'
import { createSupabaseAdminClient } from './db-cleanup'
import { runEventTitle } from './run-context'

/**
 * A closed event starting soon enough to reach the dashboard, which lists the
 * twelve nearest. Carries the run's prefix so teardown claims it.
 */
export async function createClosedEventSoon(label: string): Promise<{ id: string; title: string }> {
  const supabase = createSupabaseAdminClient()
  const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: runEventTitle(label),
      event_status: 'Registration Closed',
      event_type: 'regular',
      time_event_start: start.toISOString(),
      time_event_end: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      description: 'Test event for the invite flow',
      location: 'Test Location',
      total_spots: 100,
    })
    .select('id, title')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create the closed invite event: ${error?.message}`)
  }

  return { id: data.id, title: data.title || '' }
}

export async function seedInvite(eventId: string, profileId: string): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const token = randomBytes(24).toString('base64url')

  const { error } = await supabase
    .from('event_invites')
    .insert({ event_id: eventId, profile_id: profileId, token })

  if (error) throw new Error(`Failed to seed the invite: ${error.message}`)

  return token
}
```

- [ ] **Step 2: Write the admin spec**

```ts
import { test, expect } from '@playwright/test'
import path from 'path'
import { readSetupUser } from '../../utils/setup-user'
import { createClosedEventSoon } from '../../utils/invite-helpers'
import { adminInvitesCopy } from '../../../app/copy/admin/invites'

const { modal } = adminInvitesCopy

test.describe('inviting somebody into a closed event', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  test('the admin generates a link and can call it off', async ({ page }) => {
    const event = await createClosedEventSoon(`Invite admin ${Date.now()}`)
    const user = await readSetupUser()

    await page.goto(`/admin/eventos/${event.id}`)
    await page.getByRole('button', { name: adminInvitesCopy.trigger }).click()

    await page.getByLabel(modal.searchLabel).fill(user.email)

    const row = page.getByRole('listitem').filter({ hasText: user.email })
    await expect(row).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: modal.invite, exact: true }).click()

    const link = page.locator('input[readonly]').filter({ hasText: '' }).first()
    await expect(link).toHaveValue(/\/convite\/.+/, { timeout: 15000 })

    await page.getByRole('button', { name: modal.revoke }).click()

    await expect(page.getByText(modal.status.revoked)).toBeVisible({ timeout: 15000 })
  })
})
```

The search matches an email, so the row is found by the setup user's own
address — no dependence on a name any other suite might also be using. If the
readonly-input locator proves brittle, give the link field a `data-testid` in
Task 15 and select on that instead.

- [ ] **Step 3: Write the participant spec**

```ts
import { test, expect } from '@playwright/test'
import path from 'path'
import { readSetupUser } from '../../utils/setup-user'
import { getProfileIdByEmail } from '../../utils/application-helpers'
import { createClosedEventSoon, seedInvite } from '../../utils/invite-helpers'
import { openParticipantDashboard } from '../../utils/direct-application-helpers'

test.describe('an invited person and a closed event', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/user.json') })

  test('the link opens the application a closed event would refuse', async ({ page }) => {
    const user = await readSetupUser()
    const profileId = await getProfileIdByEmail(user.email)
    if (!profileId) throw new Error(`No profile for the setup user ${user.email}`)

    const event = await createClosedEventSoon(`Invite user ${Date.now()}`)
    const token = await seedInvite(event.id, profileId)

    // The card is dead for everyone else.
    await openParticipantDashboard(page)
    const card = page
      .locator('[data-testid^="event-card"]')
      .filter({ hasText: event.title })
    await expect(card).toBeVisible({ timeout: 30000 })

    await page.goto(`/convite/${token}`)

    await expect(page).toHaveURL(new RegExp(`/dashboard/${event.id}/regras`), {
      timeout: 30000,
    })

    // And now the same card offers the application it refused a moment ago.
    await openParticipantDashboard(page)
    await expect(
      page
        .locator('[data-testid^="event-card"]')
        .filter({ hasText: event.title })
        .getByRole('link', { name: 'Me candidatar' }),
    ).toBeVisible({ timeout: 30000 })
  })
})
```

The quiz itself is not walked again here: `user-application-rules-gate.spec.ts`
already owns that journey, and repeating it would add minutes to a suite that
already holds the database for thirteen.

- [ ] **Step 4: Add the invite path to the redirect spec**

In `e2e/tests/unauthenticated/auth-redirect.spec.ts`, extend the list Task 12
already rewrote:

```ts
    const protectedRoutes = [
      '/dashboard',
      '/admin',
      '/conta'
    ]
```

becomes:

```ts
    const protectedRoutes = [
      '/dashboard',
      '/admin',
      '/conta',
      // An invite arrives by message and is opened signed out more often than
      // not. Losing it at the door is the whole failure this guards against.
      '/convite/whatever-token'
    ]
```

- [ ] **Step 5: Lint**

Run: `pnpm lint`
Expected: PASS. Do not run E2E here — it runs once, at Task 20.

- [ ] **Step 6: Commit**

```bash
git add e2e/utils/invite-helpers.ts e2e/tests/authenticated/admin-invite-closed-event.spec.ts e2e/tests/authenticated/user-invited-closed-event.spec.ts e2e/tests/unauthenticated/auth-redirect.spec.ts
git commit -m "test(invites): walk the invited person through a closed event

Two files rather than one: Playwright picks the signed-in account from
the filename, and this journey has two of them."
```

---

### Task 20: Green across the board

- [ ] **Step 1: Lint the whole project**

Run: `pnpm lint`
Expected: PASS, no warnings introduced.

- [ ] **Step 2: Unit and integration**

Check the database lock, then run: `pnpm test`
Expected: PASS, everything.

If a failure looks like a local runtime problem rather than a code problem —
jsdom and `localStorage` misbehave under Node 26 — re-run under Node 24 LTS
before concluding anything about the code.

- [ ] **Step 3: E2E, once**

Check the lock again — E2E holds it for roughly thirteen minutes and locks out
every other agent for all of it. If it is held, wait; do not queue behind it.

Run: `pnpm test:e2e`
Expected: PASS, every project.

- [ ] **Step 4: Report**

State plainly what passed and what did not, with the output. A failing test is
not "unrelated" — fix it.

- [ ] **Step 5: Stop**

Do not open a pull request. Ask first.

---

## Notes for the reviewer

**No news dialog item.** The news dialog is for users, and this change is
invisible to them: an invited person sees the ordinary application flow, and
everyone else sees exactly what they saw before. The admin-facing half is not
what that dialog is for.

**The registration-limit email and its trigger are untouched.**
`close_registrations_at_limit` only runs while an event is `Registration Open`,
so an application to a closed event never reaches it.

**`total_spots` is not enforced anywhere.** The trigger closes registrations at
a hardcoded 90 and does not read the column. That was true before this change
and stays true after it; it is worth a ticket of its own, not a fix smuggled in
here.

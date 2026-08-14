# POS-479 — Account signup is not event registration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make it impossible for someone to finish signup believing they are registered for a party.

**Architecture:** Three independent changes. (1) Account-creation copy stops calling itself "inscrição". (2) A new static page, `/conta/tudo-pronto`, becomes the last step of first-time signup and explains the journey. (3) The dashboard is regrouped by ownership — "events I applied to" versus "events available" — with a banner for people who never applied, and the event status moving from section headings onto a badge on the card.

**Tech Stack:** React Router 7, React 19, TypeScript, Tailwind v4, Kysely, Supabase, Vitest + React Testing Library, Playwright.

**Design doc:** `docs/plans/POS-479-account-vs-event-registration-design.md`

**Before starting:** work inside the worktree
`/Users/angelodias/Documents/GIT/private/positiv-project/worktrees/pos-479-melhorar-fluxo-pra-pessoa-entender-que-cadastro-no-site-nao`
on branch `pos-479-melhorar-fluxo-pra-pessoa-entender-que-cadastro-no-site-nao`.

Useful commands:

- `pnpm test:unit` — Vitest unit tests
- `pnpm test:unit <path>` — a single file
- `pnpm test:integration <path>` — integration tests, needs local Supabase running
- `pnpm test:e2e` — Playwright, runs against a production build
- `pnpm lint` — ESLint + type generation + tsc

Both plan documents (`POS-479-*-design.md` and `POS-479-*-plan.md`) must be deleted before opening the PR.

---

### Task 1: Account creation stops being called "inscrição"

**Files:**

- Modify: `app/pages/auth/register-page.tsx:55`
- Modify: `app/pages/auth/login-page.tsx:92`
- Test: `app/pages/auth/login-page.test.tsx:199`

- [ ] **Step 1: Update the failing expectation in the existing test**

In `app/pages/auth/login-page.test.tsx`, line 199 currently reads:

```tsx
    const registerLink = screen.getByRole("link", { name: /Inscreva-se/i })
```

Change it to:

```tsx
    const registerLink = screen.getByRole("link", { name: /Criar conta/i })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit app/pages/auth/login-page.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "link" and name /Criar conta/i`

- [ ] **Step 3: Change the copy**

In `app/pages/auth/login-page.tsx`, replace the link text:

```tsx
              <b>
                Não tem uma conta? <Link to={LOGON}>Criar conta</Link>
              </b>
```

In `app/pages/auth/register-page.tsx`, replace the card title:

```tsx
          <CardTitle className="text-2xl">Criar conta</CardTitle>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:unit app/pages/auth/login-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/auth/login-page.tsx app/pages/auth/register-page.tsx app/pages/auth/login-page.test.tsx
git commit -m "fix(auth): call account creation 'Criar conta' instead of 'Inscreva-se'"
```

Note: `e2e/tests/unauthenticated/onboarding-flow.spec.ts` also matches `/inscreva-se/i` on lines 21 and 28. It is updated in Task 11, together with the other E2E changes.

---

### Task 2: `hasEverApplied` query

Whether the person has ever applied to any event, cancelled or not. Cancelling is an `UPDATE`
that sets `is_user_applied = false` and keeps the row, so the mere existence of a row is the
signal.

**Files:**

- Create: `app/business/participant/has-ever-applied.server.ts`
- Test: `app/business/participant/has-ever-applied.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `app/business/participant/has-ever-applied.integration.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"
import { hasEverApplied } from "./has-ever-applied.server"

describe("hasEverApplied", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("returns false for a profile that never applied to anything", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      full_name: "Never Applied",
      email: `never-applied-${Date.now()}@example.com`,
    })

    expect(await hasEverApplied(profile.id)).toBe(false)
  })

  it("returns true for a profile with an active application", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      full_name: "Applied",
      email: `applied-${Date.now()}@example.com`,
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Evento com candidatura",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
    })

    expect(await hasEverApplied(profile.id)).toBe(true)
  })

  it("returns true after the person cancelled their only application", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      full_name: "Cancelled",
      email: `cancelled-${Date.now()}@example.com`,
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Evento cancelado",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: false,
      cancellation_date: new Date().toISOString(),
    })

    expect(await hasEverApplied(profile.id)).toBe(true)
  })

  it("returns false when the only application belongs to someone else", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      full_name: "Bystander",
      email: `bystander-${Date.now()}@example.com`,
    })
    const other = await createTestProfile(tracker, kysely, {
      full_name: "Other Person",
      email: `other-${Date.now()}@example.com`,
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Evento de outra pessoa",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: other.id,
      event_id: event.id,
      is_user_applied: true,
    })

    expect(await hasEverApplied(profile.id)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:integration app/business/participant/has-ever-applied.integration.test.ts`
Expected: FAIL — cannot resolve `./has-ever-applied.server`

If the run fails because the database is unreachable, start the local Supabase instance
(`supabase db reset` if it has never been seeded) and run it again.

- [ ] **Step 3: Write the implementation**

Create `app/business/participant/has-ever-applied.server.ts`:

```ts
import { kyselyDb } from "~/kysely-db"

export const hasEverApplied = async (profileId: string): Promise<boolean> => {
  const row = await kyselyDb
    .selectFrom("event_participants")
    .select("id")
    .where("profile_id", "=", profileId)
    .limit(1)
    .executeTakeFirst()

  return Boolean(row)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:integration app/business/participant/has-ever-applied.integration.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add app/business/participant/has-ever-applied.server.ts app/business/participant/has-ever-applied.integration.test.ts
git commit -m "feat(dashboard): add hasEverApplied query"
```

---

### Task 3: `splitEvents` groups by ownership

**Files:**

- Modify: `app/pages/dashboard/utils/split-events.ts`
- Test: `app/pages/dashboard/utils/split-events.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `app/pages/dashboard/utils/split-events.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { Event } from "~types/database/entities.types"
import { splitEvents } from "./split-events"

const makeEvent = (overrides: Partial<Event>): Event =>
  ({
    id: "event-id",
    title: "Evento",
    event_status: "Registration Open",
    is_applied: false,
    ...overrides,
  }) as Event

describe("splitEvents", () => {
  it("returns empty lists when there are no events", () => {
    expect(splitEvents([])).toEqual({ applied: [], available: [] })
  })

  it("returns empty lists when events are undefined", () => {
    expect(splitEvents(undefined)).toEqual({ applied: [], available: [] })
  })

  it("puts events the person applied to in 'applied'", () => {
    const applied = makeEvent({ id: "applied-event", is_applied: true })
    const other = makeEvent({ id: "other-event", is_applied: false })

    const result = splitEvents([applied, other])

    expect(result.applied.map((e) => e.id)).toEqual(["applied-event"])
    expect(result.available.map((e) => e.id)).toEqual(["other-event"])
  })

  it("keeps an applied event out of 'available' even when registration is closed", () => {
    const applied = makeEvent({
      id: "closed-applied",
      is_applied: true,
      event_status: "Registration Closed",
    })

    const result = splitEvents([applied])

    expect(result.applied.map((e) => e.id)).toEqual(["closed-applied"])
    expect(result.available).toEqual([])
  })

  it("keeps scheduled and closed events the person did not apply to in 'available'", () => {
    const scheduled = makeEvent({ id: "scheduled", event_status: "Scheduled" })
    const closed = makeEvent({
      id: "closed",
      event_status: "Registration Closed",
    })

    const result = splitEvents([scheduled, closed])

    expect(result.available.map((e) => e.id)).toEqual(["scheduled", "closed"])
    expect(result.applied).toEqual([])
  })

  it("preserves the incoming order inside each list", () => {
    const first = makeEvent({ id: "first", is_applied: true })
    const second = makeEvent({ id: "second", is_applied: true })

    expect(splitEvents([first, second]).applied.map((e) => e.id)).toEqual([
      "first",
      "second",
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit app/pages/dashboard/utils/split-events.test.ts`
Expected: FAIL — received `{ registrationOpen: [...], scheduled: [], registrationClosed: [] }`

- [ ] **Step 3: Rewrite the implementation**

Replace the whole contents of `app/pages/dashboard/utils/split-events.ts`:

```ts
import type { Event } from "~types/database/entities.types"

export const splitEvents = (events: Event[] | undefined) => {
  const empty: {
    applied: Event[]
    available: Event[]
  } = {
    applied: [],
    available: [],
  }

  if (!events || events.length < 1) return empty

  return events.reduce((acc, event) => {
    if (event.is_applied) {
      acc.applied.push(event)
    } else {
      acc.available.push(event)
    }
    return acc
  }, empty)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:unit app/pages/dashboard/utils/split-events.test.ts`
Expected: PASS — 6 tests

TypeScript now fails in `app/pages/dashboard/dashboard-page.tsx`, which still destructures
`registrationOpen`. That is fixed in Task 6; do not touch it yet.

- [ ] **Step 5: Commit**

```bash
git add app/pages/dashboard/utils/split-events.ts app/pages/dashboard/utils/split-events.test.ts
git commit -m "feat(dashboard): split events by application instead of status"
```

---

### Task 4: Event status badge

The status information that section headings used to carry moves onto the card.

**Files:**

- Modify: `app/components/atoms/badges/badges.tsx`
- Test: `app/components/atoms/badges/event-status-badge.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `app/components/atoms/badges/event-status-badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EventStatusBadge } from "./badges"

describe("EventStatusBadge", () => {
  it("says registration is open", () => {
    render(<EventStatusBadge event_status="Registration Open" />)
    expect(screen.getByText("Inscrições abertas")).toBeInTheDocument()
  })

  it("says the event is scheduled", () => {
    render(<EventStatusBadge event_status="Scheduled" />)
    expect(screen.getByText("Em breve")).toBeInTheDocument()
  })

  it("says registration is closed", () => {
    render(<EventStatusBadge event_status="Registration Closed" />)
    expect(screen.getByText("Inscrições encerradas")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit app/components/atoms/badges/event-status-badge.test.tsx`
Expected: FAIL — `EventStatusBadge` is not exported by `./badges`

- [ ] **Step 3: Add the component**

Append to `app/components/atoms/badges/badges.tsx`, and add `EventStatus` to the existing
type import at the top of the file so it reads
`import type { Event, EventStatus } from "~/types/database/entities.types"`:

```tsx
export const EventStatusBadge = ({
  event_status,
}: {
  event_status: EventStatus
}) => {
  const { isOpen, isScheduled } = checkEventStatus(event_status)

  if (isOpen) return <Badge variant="default">Inscrições abertas</Badge>
  if (isScheduled) return <Badge variant="secondary">Em breve</Badge>
  return <Badge variant="outline">Inscrições encerradas</Badge>
}
```

Add the helper import at the top of the same file:

```tsx
import { checkEventStatus } from "~/lib/helpers/check-event-status"
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:unit app/components/atoms/badges/event-status-badge.test.tsx`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add app/components/atoms/badges/badges.tsx app/components/atoms/badges/event-status-badge.test.tsx
git commit -m "feat(events): add event status badge"
```

---

### Task 5: Show the status badge on the event card

**Files:**

- Modify: `app/components/organisms/event-card/event-card.tsx:68`
- Test: `app/components/organisms/event-card/event-card.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `app/components/organisms/event-card/event-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import type { Event } from "~types/database/entities.types"
import { EventCard } from "./event-card"

const event = {
  id: "event-id",
  title: "Positiv de Agosto",
  description: "Uma festa",
  emoji: "🎉",
  event_status: "Registration Open",
  event_type: "regular",
  location: "São Paulo",
  ticket_price: 120,
  time_event_start: new Date("2030-08-23T22:00:00.000Z").toISOString(),
  is_applied: false,
} as unknown as Event

const renderCard = (overrides: Partial<Event> = {}) => {
  const router = createMemoryRouter(
    [
      {
        path: "/dashboard",
        element: (
          <EventCard
            data-testid="event-card-test"
            event={{ ...event, ...overrides }}
          />
        ),
      },
    ],
    { initialEntries: ["/dashboard"] },
  )

  return render(<RouterProvider router={router} />)
}

describe("EventCard", () => {
  it("shows the registration status of an open event", () => {
    renderCard()
    expect(screen.getByText("Inscrições abertas")).toBeInTheDocument()
  })

  it("shows the registration status of a closed event", () => {
    renderCard({ event_status: "Registration Closed" })
    expect(screen.getByText("Inscrições encerradas")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit app/components/organisms/event-card/event-card.test.tsx`
Expected: FAIL — unable to find text "Inscrições abertas"

- [ ] **Step 3: Render the badge in the card**

In `app/components/organisms/event-card/event-card.tsx`, change the import on line 12 to
include the new badge:

```tsx
import { BDSMBadge, EventStatusBadge } from "~/components/atoms/badges/badges"
```

and render it next to the BDSM badge inside `CardContent`:

```tsx
          <div>
            {ticket_price && (
              <DataPair pair={["Valor", `R$ ${ticket_price}`]} />
            )}
            {location && <DataPair pair={["Local", location]} />}
            <div className="flex flex-wrap gap-2 mt-2">
              <EventStatusBadge event_status={event_status} />
              <BDSMBadge event_type={event_type} />
            </div>
          </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:unit app/components/organisms/event-card/event-card.test.tsx`
Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add app/components/organisms/event-card/event-card.tsx app/components/organisms/event-card/event-card.test.tsx
git commit -m "feat(events): show event status badge on the event card"
```

---

### Task 6: Dashboard shows two ownership sections and a banner

**Files:**

- Modify: `app/pages/dashboard/dashboard-page.tsx`
- Test: `app/pages/dashboard/dashboard-sections.test.tsx` (create)

The existing `dashboard-page.test.tsx` only covers the `meta` function and keeps passing
unchanged.

- [ ] **Step 1: Write the failing test**

Create `app/pages/dashboard/dashboard-sections.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import type { Event } from "~types/database/entities.types"
import { EventsContent } from "./dashboard-page"

const makeEvent = (overrides: Partial<Event>): Event =>
  ({
    id: "event-id",
    title: "Evento",
    description: "Uma festa",
    emoji: "🎉",
    event_status: "Registration Open",
    event_type: "regular",
    location: "São Paulo",
    ticket_price: 120,
    time_event_start: new Date("2030-08-23T22:00:00.000Z").toISOString(),
    is_applied: false,
    ...overrides,
  }) as Event

const renderContent = (props: {
  events: Event[]
  hasEverApplied: boolean
}) => {
  const router = createMemoryRouter(
    [
      {
        path: "/dashboard",
        element: (
          <EventsContent
            events={props.events}
            hasEverApplied={props.hasEverApplied}
          />
        ),
      },
    ],
    { initialEntries: ["/dashboard"] },
  )

  return render(<RouterProvider router={router} />)
}

describe("Dashboard sections", () => {
  it("shows the banner to someone who never applied to an event", () => {
    renderContent({ events: [], hasEverApplied: false })

    expect(
      screen.getByText(
        "Sua conta está pronta — mas ter conta não te coloca em nenhuma festa.",
      ),
    ).toBeInTheDocument()
  })

  it("hides the banner from someone who has applied before", () => {
    renderContent({ events: [], hasEverApplied: true })

    expect(
      screen.queryByText(
        "Sua conta está pronta — mas ter conta não te coloca em nenhuma festa.",
      ),
    ).not.toBeInTheDocument()
  })

  it("always renders the applied section, with an empty state", () => {
    renderContent({ events: [], hasEverApplied: true })

    expect(
      screen.getByRole("heading", { name: "Eventos em que você se inscreveu" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Você não tem nenhuma inscrição no momento."),
    ).toBeInTheDocument()
  })

  it("lists an applied event only in the applied section", () => {
    renderContent({
      events: [
        makeEvent({ id: "applied-event", title: "Festa Inscrita", is_applied: true }),
        makeEvent({ id: "other-event", title: "Festa Disponível" }),
      ],
      hasEverApplied: true,
    })

    expect(screen.getAllByText("Festa Inscrita")).toHaveLength(1)
    expect(screen.getByTestId("event-card-applied")).toHaveTextContent(
      "Festa Inscrita",
    )
    expect(screen.getByTestId("event-card-available")).toHaveTextContent(
      "Festa Disponível",
    )
  })

  it("shows an empty state when there are no available events", () => {
    renderContent({
      events: [makeEvent({ id: "applied-event", is_applied: true })],
      hasEverApplied: true,
    })

    expect(
      screen.getByText("Nenhum evento por aqui no momento."),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit app/pages/dashboard/dashboard-sections.test.tsx`
Expected: FAIL — `EventsContent` is not exported from `./dashboard-page`

- [ ] **Step 3: Rewrite the page**

In `app/pages/dashboard/dashboard-page.tsx`:

Add the import for the new query next to the existing business imports:

```tsx
import { hasEverApplied } from "~/business/participant/has-ever-applied.server"
```

Change the loader to fetch the flag alongside the streamed events:

```tsx
export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getContext(request, params)

  if (!currentProfile?.basic_data_filled) {
    throw await redirectWithInfo(
      AGREE_TO_TERMS,
      "Você precisa aceitar os termos antes de continuar",
    )
  }

  return {
    events: loadEvents(currentProfile.id),
    hasEverApplied: await hasEverApplied(currentProfile.id),
  }
}
```

`loadEvents` keeps calling `getNextEvents` but now returns the raw list, because the split
happens in the component:

```tsx
async function loadEvents(profileId: string) {
  const result = await getNextEvents(profileId, 12)

  if (!result.success) {
    // Throwing an error allows the <Await> component's errorElement to catch it
    throw new Error(
      result.errors.map((e) => e.message).join(", ") ||
        "Failed to load events.",
    )
  }

  return result.data
}
```

Replace `Wrapper` and `EventsContent` with:

```tsx
export const EventsContent: FC<{
  events: Event[]
  hasEverApplied: boolean
}> = ({ events, hasEverApplied }) => {
  const { applied, available } = splitEvents(events)

  return (
    <>
      {!hasEverApplied && (
        <Alert>
          <AlertTitle>
            Sua conta está pronta — mas ter conta não te coloca em nenhuma
            festa.
          </AlertTitle>
          <AlertDescription>
            Escolha um evento abaixo e faça sua inscrição.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <h2>Eventos em que você se inscreveu</h2>
        {applied.length ? (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {applied.map((event) => (
              <EventCard
                data-testid="event-card-applied"
                key={event.id}
                event={event}
              />
            ))}
          </div>
        ) : (
          <p>Você não tem nenhuma inscrição no momento.</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2>Eventos da Positiv</h2>
        {available.length ? (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {available.map((event) => (
              <EventCard
                data-testid="event-card-available"
                key={event.id}
                event={event}
              />
            ))}
          </div>
        ) : (
          <p>Nenhum evento por aqui no momento.</p>
        )}
      </div>
    </>
  )
}
```

Add the alert import next to the other component imports:

```tsx
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
```

And pass the flag through in the default export:

```tsx
const DashboardPage = ({ loaderData }: Route.ComponentProps) => {
  return (
    <Suspense fallback={<EventListSkeleton />}>
      <Await resolve={loaderData.events}>
        {(events) => (
          <EventsContent
            events={events}
            hasEverApplied={loaderData.hasEverApplied}
          />
        )}
      </Await>
    </Suspense>
  )
}
```

Delete the now-unused `WrapperProps` type and the `ReactNode` import.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:unit app/pages/dashboard/`
Expected: PASS — the 5 new section tests plus the 2 existing meta tests

- [ ] **Step 5: Commit**

```bash
git add app/pages/dashboard/dashboard-page.tsx app/pages/dashboard/dashboard-sections.test.tsx
git commit -m "feat(dashboard): group events by application and add onboarding banner"
```

---

### Task 7: Skeleton mirrors the new layout

`EventListSkeleton` is the `Suspense` fallback for the dashboard. It still renders the three
old headings, so the old layout flashes on every load.

**Files:**

- Modify: `app/components/organisms/event-list/event-list-skeleton.tsx`
- Test: `app/components/organisms/event-list/event-list-skeleton.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `app/components/organisms/event-list/event-list-skeleton.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EventListSkeleton } from "./event-list-skeleton"

describe("EventListSkeleton", () => {
  it("mirrors the dashboard sections", () => {
    render(<EventListSkeleton />)

    expect(
      screen.getByRole("heading", { name: "Eventos em que você se inscreveu" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Eventos da Positiv" }),
    ).toBeInTheDocument()
  })

  it("does not render the old status headings", () => {
    render(<EventListSkeleton />)

    expect(screen.queryByText("Inscrições encerradas")).not.toBeInTheDocument()
    expect(screen.queryByText("Eventos agendados")).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit app/components/organisms/event-list/event-list-skeleton.test.tsx`
Expected: FAIL — heading "Eventos em que você se inscreveu" not found

- [ ] **Step 3: Update the skeleton**

Replace the whole contents of `app/components/organisms/event-list/event-list-skeleton.tsx`:

```tsx
import { EventCardSkeleton } from "../event-card/event-card-skeleton"

export const EventListSkeleton = () => {
  return (
    <div data-testid="event-list-skeleton" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-4">
        <h2>Eventos em que você se inscreveu</h2>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
          <EventCardSkeleton />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-8">
        <h2>Eventos da Positiv</h2>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:unit app/components/organisms/event-list/event-list-skeleton.test.tsx`
Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add app/components/organisms/event-list/event-list-skeleton.tsx app/components/organisms/event-list/event-list-skeleton.test.tsx
git commit -m "fix(dashboard): match loading skeleton to the new sections"
```

---

### Task 8: The account-ready page

**Files:**

- Modify: `app/lib/paths.ts`
- Create: `app/pages/account/account-ready-page.tsx`
- Modify: `app/routes.ts`
- Test: `app/pages/account/account-ready-page.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `app/pages/account/account-ready-page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import AccountReadyPage, { meta } from "./account-ready-page"

const renderPage = () => {
  const router = createMemoryRouter(
    [
      {
        path: "/conta/tudo-pronto",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        element: <AccountReadyPage {...({} as any)} />,
      },
      { path: "/dashboard", element: <div>Dashboard</div> },
    ],
    { initialEntries: ["/conta/tudo-pronto"] },
  )

  return render(<RouterProvider router={router} />)
}

describe("Account ready page", () => {
  it("tells the person the account is ready", () => {
    renderPage()
    expect(
      screen.getByRole("heading", { name: "Sua conta está pronta! 🎉" }),
    ).toBeInTheDocument()
  })

  it("says an account is not a spot at a party", () => {
    renderPage()
    expect(
      screen.getByText(
        "Mas atenção: ter conta na Positiv não é o mesmo que estar em uma festa.",
      ),
    ).toBeInTheDocument()
  })

  it("explains that each event has its own registration", () => {
    renderPage()
    expect(
      screen.getByText(
        "Cada evento tem inscrição própria. Para ir a um evento, você precisa se inscrever nele — e a inscrição vale só para aquele evento.",
      ),
    ).toBeInTheDocument()
  })

  it("explains that registration is followed by selection", () => {
    renderPage()
    expect(
      screen.getByText(
        "Depois que você se inscreve, a organização seleciona quem vai. Você recebe a resposta por email.",
      ),
    ).toBeInTheDocument()
  })

  it("links to the dashboard", () => {
    renderPage()
    expect(
      screen.getByRole("link", { name: "Ver eventos com inscrições abertas" }),
    ).toHaveAttribute("href", "/dashboard")
  })

  it("sets the page title", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleMeta = meta({} as any).find((m) => "title" in m)
    expect(titleMeta).toEqual({ title: "Tudo pronto | Positiv Party" })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit app/pages/account/account-ready-page.test.tsx`
Expected: FAIL — cannot resolve `./account-ready-page`

- [ ] **Step 3: Add the path, the page and the route**

In `app/lib/paths.ts`, next to the other account paths:

```ts
const ACCOUNT_READY = `${ACCOUNT}/tudo-pronto`
```

and inside `paths.dash.account`, add `ACCOUNT_READY` to the exported object.

Create `app/pages/account/account-ready-page.tsx`:

```tsx
import { Button } from "~/components/atoms/button/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/account-ready-page"

const {
  dash: { DASHBOARD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Tudo pronto")
}

const AccountReadyPage = ({}: Route.ComponentProps) => {
  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">Sua conta está pronta! 🎉</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p>
          Mas atenção: ter conta na Positiv não é o mesmo que estar em uma
          festa.
        </p>
        <p>
          Cada evento tem inscrição própria. Para ir a um evento, você precisa
          se inscrever nele — e a inscrição vale só para aquele evento.
        </p>
        <p>
          Depois que você se inscreve, a organização seleciona quem vai. Você
          recebe a resposta por email.
        </p>
      </CardContent>

      <CardFooter>
        <Button to={DASHBOARD}>Ver eventos com inscrições abertas</Button>
      </CardFooter>
    </Card>
  )
}

export default AccountReadyPage
```

In `app/routes.ts`, inside the existing `...prefix("conta", [...])` block:

```ts
        route("/tudo-pronto", "pages/account/account-ready-page.tsx"),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:unit app/pages/account/account-ready-page.test.tsx`
Expected: PASS — 6 tests

If the `./+types/account-ready-page` import cannot be resolved, run `pnpm lint` once to
regenerate React Router's route types, then run the test again.

- [ ] **Step 5: Commit**

```bash
git add app/lib/paths.ts app/routes.ts app/pages/account/account-ready-page.tsx app/pages/account/account-ready-page.test.tsx
git commit -m "feat(account): add account-ready page explaining signup is not registration"
```

---

### Task 9: Redirect first-time signup to the account-ready page

**Files:**

- Modify: `app/business/participant/basic-data.server.ts:157`
- Test: `app/business/participant/extra-basic-data.server.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `app/business/participant/extra-basic-data.server.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const execute = vi.fn().mockResolvedValue(undefined)
const executeTakeFirst = vi.fn().mockResolvedValue(undefined)

vi.mock("~/lib/supabase/db.server", () => {
  const chain = {
    updateTable: vi.fn(() => chain),
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    execute,
    selectFrom: vi.fn(() => chain),
    select: vi.fn(() => chain),
    executeTakeFirst,
  }
  return { db: chain }
})

vi.mock("../newsletter/auto-subscribe.server", () => ({
  subscribeProfileToNewsletter: vi.fn(),
}))

import { extraBasicData } from "./basic-data.server"

const validProfile = {
  id: "profile-id",
  full_name: "Test User",
  social_name: "Test",
  date_of_birth: "1990-01-01",
  where_lives: "São Paulo",
  how_came_to_us: "Friend",
  phone: "11999999999",
  cpf: "12345678901",
  rg: "123456789",
  rg_issuer: "SSP/SP",
  is_admin: false,
  basic_data_filled: false,
}

const formData = {
  gender: ["Mulher cis"],
  orientation: ["Bissexual"],
  pronouns: ["ela/dela"],
  race_color: ["Branca"],
}

const callExtraBasicData = (profileOverrides: Record<string, unknown>) =>
  extraBasicData({
    formData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: {
      currentProfile: { ...validProfile, ...profileOverrides },
      supabaseHeaders: new Headers(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  })

describe("extraBasicData redirect target", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sends a first-time person to the account-ready page", async () => {
    const response = await callExtraBasicData({ basic_data_filled: false })
    expect(response.headers.get("Location")).toBe("/conta/tudo-pronto")
  })

  it("sends someone who already filled their data to the dashboard", async () => {
    const response = await callExtraBasicData({ basic_data_filled: true })
    expect(response.headers.get("Location")).toBe("/dashboard")
  })

  it("sends an admin to the admin dashboard even on first completion", async () => {
    const response = await callExtraBasicData({
      basic_data_filled: false,
      is_admin: true,
    })
    expect(response.headers.get("Location")).toBe("/admin")
  })
})
```

If a test lands on `/conta/dados-basicos` instead of the expected path, the fixture failed
`basicDataSchema` (defined in `app/business/common.ts:109`) — `extraBasicData` re-validates
the stored profile before saving. Add whatever field the schema requires to `validProfile`
and run again; do not weaken the assertion.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit app/business/participant/extra-basic-data.server.test.ts`
Expected: FAIL — first test receives `/dashboard` instead of `/conta/tudo-pronto`

- [ ] **Step 3: Change the redirect target**

In `app/business/participant/basic-data.server.ts`, add `ACCOUNT_READY` to the destructured
paths near the bottom of the file:

```ts
const {
  dash: {
    DASHBOARD,
    account: { GENDER_PRONOUNS_ORIENTATION, BASIC_DATA, ACCOUNT_READY },
  },
  admin: { ADMIN_DASHBOARD },
} = paths
```

Inside `extraBasicData`, read the flag **before** the update runs and use it for the
destination:

```ts
  const isFirstCompletion = !currentProfile.basic_data_filled
```

Place that line right after the `currentProfile` guard at the top of the function, and
replace the `targetPath` line:

```ts
  const targetPath = currentProfile.is_admin
    ? ADMIN_DASHBOARD
    : isFirstCompletion
      ? ACCOUNT_READY
      : DASHBOARD
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:unit app/business/participant/`
Expected: PASS — the 3 new tests plus the existing `basic-data.server.test.ts` suite

- [ ] **Step 5: Commit**

```bash
git add app/business/participant/basic-data.server.ts app/business/participant/extra-basic-data.server.test.ts
git commit -m "feat(account): send first-time signups to the account-ready page"
```

---

### Task 10: E2E auth fixture follows the new signup flow

Every authenticated Playwright project depends on this setup. If it is wrong, the whole
authenticated suite fails at setup rather than in one spec.

**Files:**

- Modify: `e2e/fixtures/auth.ts:165-171`

- [ ] **Step 1: Update the fixture**

In `e2e/fixtures/auth.ts`, the block that currently reads:

```ts
    await Promise.all([
      page.waitForNavigation({ url: expectedDashboardUrl, waitUntil: "networkidle" }),
      continueButton2.click(),
    ])
  }
```

becomes:

```ts
    if (isAdmin) {
      await Promise.all([
        page.waitForNavigation({ url: expectedDashboardUrl, waitUntil: "networkidle" }),
        continueButton2.click(),
      ])
    } else {
      // First-time signup now ends on the account-ready page, which explains
      // that having an account is not the same as being registered for an event
      await Promise.all([
        page.waitForNavigation({ url: /conta\/tudo-pronto$/, waitUntil: "networkidle" }),
        continueButton2.click(),
      ])

      await expect(
        page.getByRole("heading", { name: "Sua conta está pronta! 🎉" }),
      ).toBeVisible()

      await Promise.all([
        page.waitForNavigation({ url: expectedDashboardUrl, waitUntil: "networkidle" }),
        page.getByRole("link", { name: "Ver eventos com inscrições abertas" }).click(),
      ])
    }
  }
```

`isAdmin` and `expectedDashboardUrl` are already in scope in this function.

- [ ] **Step 2: Run the setup project to verify it passes**

Run: `pnpm test:e2e -- --project=setup`
Expected: PASS — both "authenticate as admin" and "authenticate as user" succeed and write
`e2e/.auth/*.json`

- [ ] **Step 3: Commit**

```bash
git add e2e/fixtures/auth.ts
git commit -m "test(e2e): walk the account-ready page in the auth setup"
```

---

### Task 11: E2E locators follow the new copy

**Files:**

- Modify: `e2e/pages/EventsPage.ts:16,17,22`
- Modify: `e2e/tests/authenticated/dashboard-streaming.spec.ts:79,82,87,88`
- Modify: `e2e/tests/authenticated/user-access-control.spec.ts:55`
- Modify: `e2e/tests/authenticated/admin-access-control.spec.ts:72`
- Modify: `e2e/tests/unauthenticated/onboarding-flow.spec.ts:21,28`

- [ ] **Step 1: Update the page object**

In `e2e/pages/EventsPage.ts`, replace the property declarations (lines 5-11) and the four
heading assignments in the constructor (lines 16-22). The declarations become:

```ts
  readonly appliedEventsHeading: Locator
  readonly availableEventsHeading: Locator
  readonly eventCards: Locator
  readonly loadingSpinner: Locator
  readonly dashboardTitle: Locator
```

and the constructor body becomes:

```ts
    this.appliedEventsHeading = page.getByRole('heading', { name: 'Eventos em que você se inscreveu' })
    this.availableEventsHeading = page.getByRole('heading', { name: 'Eventos da Positiv' })
    this.eventCards = page.locator('[data-testid^="event-card"]')
    this.loadingSpinner = page.locator('.loading-spinner')
    this.dashboardTitle = page.getByRole('heading', { name: 'Dashboard' })
```

`openRegistrationHeading`, `closedRegistrationHeading`, `scheduledEventsHeading` and
`openEventsHeading` are gone. Run `pnpm lint` and fix every usage the compiler reports —
usages that meant "the section with open events" become `availableEventsHeading`. Locators
that match the "Fazer inscrição" button stay as they are: button labels do not change in
this ticket.

- [ ] **Step 2: Update the specs**

In `e2e/tests/authenticated/dashboard-streaming.spec.ts`, replace the waits and counts on
lines 79-88 so they use the new headings:

```ts
    await page.waitForSelector('h2:has-text("Eventos em que você se inscreveu")', { timeout: 5000 })

    const appliedSection = await page.locator('h2:has-text("Eventos em que você se inscreveu")').isVisible()
    expect(appliedSection).toBe(true)

    const availableSection = await page.locator('h2:has-text("Eventos da Positiv")').count()
    expect(availableSection).toBeGreaterThan(0)
```

In `e2e/tests/authenticated/user-access-control.spec.ts:55` and
`e2e/tests/authenticated/admin-access-control.spec.ts:72`, replace the heading assertion:

```ts
      const heading = page.getByRole('heading', { name: 'Eventos da Positiv', exact: true })
```

In `e2e/tests/unauthenticated/onboarding-flow.spec.ts`, lines 21 and 28 match the old signup
copy:

```ts
    const registerLink = page.getByRole('link', { name: /criar conta/i })
```

```ts
    await expect(page.getByText('Criar conta')).toBeVisible()
```

- [ ] **Step 3: Run the affected suites**

Run: `pnpm test:e2e -- --project=chromium`
Then: `pnpm test:e2e -- --project=chromium-authenticated-user`
Then: `pnpm test:e2e -- --project=chromium-authenticated-admin`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add e2e/pages/EventsPage.ts e2e/tests/authenticated/dashboard-streaming.spec.ts e2e/tests/authenticated/user-access-control.spec.ts e2e/tests/authenticated/admin-access-control.spec.ts e2e/tests/unauthenticated/onboarding-flow.spec.ts
git commit -m "test(e2e): follow the new dashboard sections and signup copy"
```

---

### Task 12: E2E coverage for the new behaviour

**Files:**

- Create: `e2e/tests/authenticated/account-vs-event-registration.spec.ts`

- [ ] **Step 1: Write the spec**

Create `e2e/tests/authenticated/account-vs-event-registration.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.describe('Account signup versus event registration', () => {
  test('a person who never applied sees the banner and an empty applied section', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(
      page.getByText('Sua conta está pronta — mas ter conta não te coloca em nenhuma festa.'),
    ).toBeVisible()

    await expect(
      page.getByRole('heading', { name: 'Eventos em que você se inscreveu' }),
    ).toBeVisible()

    await expect(
      page.getByText('Você não tem nenhuma inscrição no momento.'),
    ).toBeVisible()
  })

  test('an event moves to the applied section after registration and appears once', async ({ page }) => {
    await page.goto('/dashboard')

    const applyButton = page.getByRole('link', { name: 'Fazer inscrição' }).first()
    const applyButtonCount = await page.getByRole('link', { name: 'Fazer inscrição' }).count()
    test.skip(applyButtonCount === 0, 'No event with open registration in this environment')

    const eventTitle = await applyButton
      .locator('xpath=ancestor::*[starts-with(@data-testid, "event-card")]')
      .locator('h3')
      .innerText()

    await applyButton.click()
    await page.waitForURL(/\/dashboard\/.+/)

    // Walk the application flow to its end
    await page.getByRole('button', { name: /confirmar/i }).last().click()
    await page.waitForURL('/dashboard')

    const appliedCard = page.getByTestId('event-card-applied').filter({ hasText: eventTitle })
    await expect(appliedCard).toHaveCount(1)

    const availableCard = page.getByTestId('event-card-available').filter({ hasText: eventTitle })
    await expect(availableCard).toHaveCount(0)

    await expect(
      page.getByText('Sua conta está pronta — mas ter conta não te coloca em nenhuma festa.'),
    ).toBeHidden()
  })
})
```

- [ ] **Step 2: Run the spec**

Run: `pnpm test:e2e -- --project=chromium-authenticated-user account-vs-event-registration`
Expected: PASS — 2 tests, or the second one skipped when the environment has no event with
open registration

If the rules quiz blocks the application flow, reuse the existing helpers in
`e2e/utils/application-helpers.ts` rather than clicking through it by hand — check what
`e2e/tests/authenticated/user-application-management.spec.ts` already does and follow it.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/authenticated/account-vs-event-registration.spec.ts
git commit -m "test(e2e): cover the account versus event registration distinction"
```

---

### Task 13: News dialog

Note: `NEWS_VERSION` and `DEFAULT_NEWS_ITEMS` live in
`app/components/organisms/news-dialog/news-utils.ts`, not in
`app/lib/helpers/constants.ts` as the root CLAUDE.md says.

**Files:**

- Modify: `app/components/organisms/news-dialog/news-utils.ts`

- [ ] **Step 1: Add the news item and bump the version**

Add to the top of `DEFAULT_NEWS_ITEMS`:

```ts
  {
    id: "dashboard-my-registrations",
    title: "✨ Ficou mais fácil saber em quais festas você se inscreveu",
    content:
      "Seu painel agora começa com a seção 'Eventos em que você se inscreveu', separada dos eventos disponíveis. Lembrando: criar conta no site não te inscreve em nenhuma festa — a inscrição é feita evento por evento.",
    isAdmin: false,
    createdAt: new Date(),
    isActive: true,
  },
```

Remove every item whose `createdAt` is more than two weeks old, and set `NEWS_VERSION` to the
current timestamp — run `node -e "console.log(Date.now())"` and paste the number:

```ts
export const NEWS_VERSION = <timestamp from the command above>
```

- [ ] **Step 2: Run the news dialog tests**

Run: `pnpm test:unit app/components/organisms/news-dialog/`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/components/organisms/news-dialog/news-utils.ts
git commit -m "chore(news): announce the clearer dashboard sections"
```

---

### Task 14: Full green run

- [ ] **Step 1: Lint and typecheck**

Run: `pnpm lint`
Expected: no errors. Fix anything reported — never with `@ts-ignore`.

- [ ] **Step 2: Run every unit and integration test**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 3: Run the whole E2E suite**

Run: `pnpm test:e2e`
Expected: PASS

- [ ] **Step 4: Delete the plan documents**

```bash
git rm docs/plans/POS-479-account-vs-event-registration-design.md docs/plans/POS-479-account-vs-event-registration-plan.md
git commit -m "chore: remove POS-479 planning documents"
```

- [ ] **Step 5: Ask Angelo before opening the PR**

Do not push or open a pull request without explicit approval.
PR title format: `[POS-479] <description>`, body follows `.github/pull_request_template.md`
and includes "Solve POS-479".

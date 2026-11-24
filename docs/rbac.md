# Roles and permissions

What each role and each permission lets a person do, and where the check
lives. `app/business/auth/rbac-docs.test.ts` fails when a value of the
`user_role` or `app_permission` enum has no section here, or when a section
names a value that no longer exists.

## How it works

People have **roles**, roles grant **permissions**, and every check asks for
a permission, never for a role
([ADR](./architecture/decisions/20261021-authorization-asks-for-permissions-never-roles.md)).

- `public.role_permissions` maps each role to its permissions. It is the only
  place that knows what a role may do.
- In the app, `can(profile, PERMISSIONS.X)` and `requirePermission` read the
  `permissions` that `get_profile_with_roles` returns.
- In the database, RLS policies call `public.authorize('x')`.

**The app's checks are the ones that hold.** Kysely connects as `postgres`
and skips RLS, so `authorize()` only protects what goes through supabase-js.
A permission that only appears in a policy protects nothing the app reads
through Kysely. Checks belong in the business function that does the work, so
a new route that reaches it cannot skip them; a route's own check is there to
redirect politely.

**The admin area is a door plus permissions for its sensitive parts**
([ADR](./architecture/decisions/20261124-the-admin-area-is-a-door-plus-sensitive-permissions.md)).
`admin.panel` opens it: events, participants and people. Money and settings
ask for `payments.manage` on top; editing events asks for `events.manage`;
the newsletter asks for `newsletter.manage`.

## Roles

A person with no role is a participant: they apply to events and manage
their own profile. Nothing in this document applies to them.

### `admin`

Runs Positiv. Holds every permission below, including `payments.manage`.

### `staff`

Works at the parties. Holds `events.apply_direct` and
`events.apply_as_staff`, and nothing else: a staff member does not enter the
admin area.

## Permissions

### `admin.panel`

Enters the admin area: the dashboard, events, an event's participants table,
a participant's page, the people list and profile pages, feedbacks and the
numbers page (without its money chapter).

- App: `getAdminContext` (`app/business/auth/admin-context.server.ts`), called
  by the admin guard (`app/pages/guard/admin.tsx`), the admin layout and every
  admin action and API route. It also decides whether the header shows the
  admin link, whether the news dialog treats the person as an admin, and
  where login and the basic-data form send the person afterwards.
- Database: no policy.

### `events.manage`

Creates and edits events.

- App: `createOrUpdateEvent` (`app/business/event/event.server.ts`).
- Database: inserting, updating and deleting `events`, and reading the ones
  that are neither open for registration nor scheduled.

### `participants.manage`

Database only.

- App: nothing asks for it. Seeing and changing an event's participants comes
  with `admin.panel`.
- Database: reading every row of `event_participants`, not just one's own.

### `participants.add_directly`

Puts a person on an event without an application of their own.

- App: the add-participants section of the event page and
  `app/pages/api/admin/event-add-participants.ts`.
- Database: no policy.

### `payments.manage`

Sees and handles money: payments, amounts and totals, recording and
cancelling payments, refunds, the WhatsApp payment message, the numbers
page's money chapter and the settings page (online and card payments, the
registration limit, the Listmonk check).

- App, actions: `handlePaymentIntent`
  (`app/business/payment/payment-intents.server.ts`) refuses every payment
  intent without it; the settings page's loader and action redirect to the
  admin dashboard.
- App, data: `paymentsVisibleTo` and `canSeePayments`
  (`app/business/payment/payment-visibility.ts`) blank the payment fields of
  participant rows and event history before they leave the server. The event
  page, the participant page, the profile page and the numbers page skip
  loading payments, the WhatsApp message and revenue without it. On screen,
  the payment columns, the payment line, the financial summary, the
  manage-payment button and the dashboard's settings link disappear.
- Database: no policy.

### `profiles.manage`

Reads another person's profile data beyond what every admin page shows.

- App: reading another person's Likert answers
  (`app/business/profile/likert-submissions.server.ts`).
- Database: reading every row of `profiles` and of `user_roles`.

### `newsletter.manage`

Runs the newsletter.

- App: the participants page's newsletter switch and the veterans list sync
  (`app/pages/admin/participants/participants-page.tsx`).
- Database: every command on `event_newsletter_campaigns`, reading
  `newsletter_subscriptions`.

### `reports.read`

Database only.

- App: nothing asks for it. The numbers page comes with `admin.panel`, its
  money chapter with `payments.manage`.
- Database: reading `event_demographics_history`.

### `events.apply_direct`

Applies to an event with one click, skipping the application form.

- App: the quick-apply button on the participant dashboard and its action
  (`app/pages/dashboard/dashboard-page.tsx`).
- Database: no policy.

Not to be confused with `events.apply_as_staff`: this one is about **how**
the person applies, that one about **which spot** they take.

### `events.apply_as_staff`

The person's own application takes a staff spot, and goes through when
registrations are closed.

- App: `applyToEvent` (`app/business/application/apply-to-event.server.ts`)
  and the participant dashboard.
- Database: no policy.

### `notifications.receive_admin`

Marks who receives the admin notifications.

- App: nothing asks for it.
- Database: `public.get_admin_user_ids()` returns everyone who holds it. No
  policy, and no code today, calls that function.

## Giving and taking a role

Roles are written only from inside Supabase, never by the app
([ADR](./architecture/decisions/20261021-authorization-asks-for-permissions-never-roles.md)).
In the SQL editor of the project, as the owner:

```sql
-- give
SELECT public.add_user_role(
  (SELECT id FROM auth.users WHERE email = 'person@example.com'),
  'staff'
);

-- take
DELETE FROM public.user_roles
 WHERE user_id = (SELECT id FROM auth.users WHERE email = 'person@example.com')
   AND role_name = 'staff';
```

The person sees the change on their next request; nothing is cached in the
session.

## Adding a role or a permission

- **A role** (for example, admissions: `admin.panel` and nothing else, so no
  money): one migration that adds the value to `user_role`, another that
  inserts its rows in `role_permissions`. No app code changes. Add its section
  under Roles.
- **A permission**: one migration that adds the value to `app_permission` (an
  enum value cannot be used in the transaction that adds it), another that
  grants it; the key in `PERMISSIONS`; the check in the business function;
  its section under Permissions.

## Not built yet

- **Per-event roles** (a staff member for one party only). Every role applies
  to every event today. It would take an optional event on the role
  assignment and a check that asks "for this event?"; build it when someone
  needs it.
- **A screen to give roles.** Roles change rarely; the SQL above is enough.

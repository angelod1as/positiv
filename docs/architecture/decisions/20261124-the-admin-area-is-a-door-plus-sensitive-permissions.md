# The admin area is a door plus permissions for its sensitive parts

- Status: accepted
- Date: 2026-11-24
- Tags: architecture, security, authorization

## Context

`admin.panel` was the only check on the admin area: whoever held it saw
events, participants, payments and settings alike. Today only the admin role
holds it, but the next roles in sight are other kinds of staff, such as
someone who only handles admissions and interviews. They need the
participants table and must not see what each person paid.

Splitting the admin area into one permission per area, scoped to an event
where it made sense, was designed and set aside: with two roles (`admin` and
`staff`) it built for people who do not exist yet.

## Decision

- `admin.panel` stays the door to the admin area: events, participants and
  people come with it.
- Sensitive parts ask for a permission on top of the door. Money is the new
  one: `payments.manage` covers payment data, payment actions, the numbers
  page's revenue and the settings page's payment switches. The rest of the
  settings page is not money and comes with the door. `events.manage` and
  `newsletter.manage` already worked this way.
- Without `payments.manage` the server does not send the data:
  `paymentsVisibleTo` blanks the payment fields before rows leave the loader,
  and `handlePaymentIntent` refuses every payment action. Hiding it on screen
  follows from that, not the other way round.
- The check lives in the business function where it can, because Kysely
  skips RLS.
- Roles stay global: no per-event roles and no screen to give roles until
  someone needs them. `docs/rbac.md` says how to add either.
- Permissions no app check asks for (`participants.manage`, `reports.read`,
  `notifications.receive_admin`) stay, documented as such: removing an enum
  value means rebuilding the type and every policy that uses it.

## Consequences

### Positive

- A role that sees participants and not money is two rows in
  `role_permissions`, with no app code.
- A person without `payments.manage` never receives an amount, even by
  reading the network tab.
- `docs/rbac.md` lists every role and permission, and a test keeps it in
  step with the enums.

### Negative

- Entering the admin area still opens every non-sensitive part at once; a
  role that should see only feedbacks, say, needs a new permission first.
- Three permissions do nothing the app relies on, and only the document says
  so.

### Neutral

- What the admin role can do does not change: it holds every permission.
- Roles are still given only inside Supabase.

## Alternatives Considered

1. **One permission per admin area, `admin.panel` retired**
   - Pros: any combination of areas for any role.
   - Cons: about ten new permissions and every admin route touched, for roles
     nobody holds; the menu and the dashboard would have to follow too.

2. **Roles scoped to an event**
   - Pros: a staff member for one party only.
   - Cons: a new column on role assignments and a context on every check,
     with every staff member working every party today.

3. **Hide payments on screen only**
   - Pros: a much smaller change.
   - Cons: the amounts still reach the browser.

## References

- WEB-69: roles and permissions, central document, coverage test
- Related: [ADR: Authorization asks for permissions, never roles](./20261021-authorization-asks-for-permissions-never-roles.md)

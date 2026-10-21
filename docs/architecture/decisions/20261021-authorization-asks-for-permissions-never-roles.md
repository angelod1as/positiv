# Authorization asks for permissions, never roles

- Status: accepted
- Date: 2026-10-21
- Tags: architecture, security, authorization

## Context

Until POS-516 there was one privileged role, `admin`, and every gate asked for it by name:
policies compared `role_name = 'admin'`, the app read an `is_admin` flag, and the admin
notification lookups filtered on the role name. The `staff` role broke that model: a staff may
apply to an event directly, but must not enter the admin panel. Answering "is this person an
admin?" no longer answers "may this person do this?".

A role name check is also easy to write and hard to spot in review. `is_admin` kept travelling
to the client after nothing gated on it, waiting to be used again.

## Decision

Users have roles, roles grant permissions, and every gate asks for a permission.

- `public.role_permissions` maps each `user_role` to the `app_permission`s it grants. It is the
  only place that knows what a role may do.
- In the database, policies call `public.authorize(permission)`. No policy names a role.
- In the app, gates call `can()` / `requirePermission` with a `PERMISSIONS` value, read from the
  `permissions` that `get_profile_with_roles` returns. That function no longer returns
  `is_admin`.
- "Who receives admin notifications" is a permission too (`notifications.receive_admin`), not
  "whoever is called admin".
- Roles are assigned only inside Supabase. No route, UI or API writes `user_roles`.

The rule is enforced, not just documented: block 4d of `eslint.config.js` fails the build when
app code reads `is_admin` or `role_name`, uses the `ROLES` constant, compares a value with
`'admin'` or looks for a role with `includes()`. `app/test/permission-guard.test.ts` proves it
fires. In the database, `rbac.integration.test.ts` fails if a policy mentions `role_name` or
`get_admin_user_ids`.

## Consequences

### Positive

- A new role is a row set in `role_permissions`, not a hunt through policies and components.
- Changing what a role may do is one migration, and every gate follows.
- A gate says what it protects (`events.manage`), not who usually has it.

### Negative

- Every new capability needs a new `app_permission` value: an enum value needs a migration of
  its own, since it cannot be used in the transaction that adds it.
- Tests that seed roles and the `ROLES` constant are exempt from the guard, so the guard
  covers application code, not the whole repository.

### Neutral

- Row-Level Security stays the enforcement layer ([ADR](./20250124-use-rls-for-authorization.md));
  only what a policy asks changes. That ADR's `is_admin` example predates this decision.

## Alternatives Considered

1. **Keep checking role names, add `staff` checks where needed**
   - Pros: no new tables or enums.
   - Cons: every gate grows a list of roles, and a third role means editing all of them.

2. **Permissions mapped in application code**
   - Pros: no table, easy to read in TypeScript.
   - Cons: RLS policies cannot read it, so the database and the app would keep two mappings.

3. **Supabase custom access token hook putting roles in the JWT**
   - Pros: no per-query lookup.
   - Cons: a role change waits for the token to refresh, and the claim is still a role, not a
     permission.

## References

- POS-516: role-based access control and the staff role
- POS-628: drop `is_admin`, permission-based admin recipients, guard against role checks
- Related: [ADR: Use Row-Level Security for Authorization](./20250124-use-rls-for-authorization.md)

# Sanity schema changes follow expand/contract

- Status: accepted
- Date: 2026-09-24
- Tags: architecture, public-site, cms, data

## Context

Unlike a Contentful environment, a Sanity dataset holds no content model: the schema lives in
the Studio's code and applies to every dataset at once. The Studio and the app also deploy
separately — see
[Host the Sanity Studio as its own workspace package](./20260924-host-the-sanity-studio-as-its-own-workspace-package.md).
A field renamed in one pull request is therefore renamed in the Studio before or after the app
that reads it, never at the same instant, and production content keeps its old shape until
something rewrites it.

## Decision

A schema change that renames or removes a field ships in steps:

1. Add the new field alongside the old one and deploy the Studio.
2. Migrate existing content with a script in `studio/migrations/`, on `development` first and
   then on `production`.
3. Deploy the app reading the new field.
4. Remove the old field in a later pull request.

Adding a field needs none of this.

## Consequences

### Positive

- The app running in production always understands the content in production.
- The same discipline the Supabase migrations already follow, so nothing new to learn.

### Negative

- A rename takes at least two pull requests instead of one.
- Migration scripts run against a live dataset, by hand, and have to be idempotent.

### Neutral

- Adding optional fields and new Section types stays a single pull request.

## Alternatives Considered

1. **Deploy the Studio and the app together on merge and accept a short mismatch**
   - Pros: one pull request per change.
   - Cons: for the minutes between the two deploys the homepage reads fields that no longer
     exist, and nothing rewrites content Editors already published in the old shape.

## References

- [Host the Sanity Studio as its own workspace package](./20260924-host-the-sanity-studio-as-its-own-workspace-package.md)

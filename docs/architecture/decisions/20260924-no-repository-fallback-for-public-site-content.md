# No repository fallback for Public Site content

- Status: accepted
- Date: 2026-09-24
- Tags: architecture, public-site, cms, reliability

## Context

Once the Public Site reads its content from Sanity, the homepage depends on a third party at
request time. The app keeps the last good response in a server-side cache and serves it,
stale, while Sanity is unreachable. That leaves one gap: right after a deploy or a restart the
cache is empty, and if Sanity is down at that moment there is nothing to serve.

## Decision

On a cold start with Sanity unreachable, the Public Site returns an error page. The repository
keeps no copy of Public Site content as a fallback: the marketing strings in
`app/copy/homepage.ts` are deleted once production is seeded.

Sanity is the single source of truth for Public Site content. Labels the Platform owns — button
text, status messages — stay in `app/copy/`.

## Consequences

### Positive

- One source of truth. An Editor's change is never silently overridden by, or diverged from,
  a string in the repository.
- No second content model to keep in step with every schema change.

### Negative

- A deploy that coincides with a Sanity outage leaves the homepage down until Sanity returns.
  We accept this: Sanity's CDN is highly available and the window is a cold start, not every
  request.

### Neutral

- A warm cache keeps serving through an outage exactly as before.

## Alternatives Considered

1. **Keep `app/copy/homepage.ts` as a fallback**
   - Pros: the homepage always renders.
   - Cons: two copies of the content that drift apart from the first edit, and a fallback
     that would show Editors' visitors outdated text without anyone noticing.

2. **Persist the last good response to disk or the database**
   - Pros: survives restarts.
   - Cons: new storage and invalidation code for an event that is rare by construction.

## References

- [Host the Sanity Studio as its own workspace package](./20260924-host-the-sanity-studio-as-its-own-workspace-package.md)

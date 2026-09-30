# Site Settings fall back to code when Sanity is down

- Status: accepted
- Date: 2026-09-30
- Tags: architecture, public-site, cms, reliability

## Context

[No repository fallback for Public Site content](./20260924-no-repository-fallback-for-public-site-content.md)
lets a Page answer with an error on a cold start while Sanity is unreachable. That was safe
while Sanity fed only the homepage.

Site Settings — the Navigation, the footer and the Notice — render on every page, the
Platform's included. Held to the same rule, a deploy during a Sanity outage would take down
the payment, dashboard and admin pages along with the Public Site.

## Decision

Page content keeps no fallback. Site Settings do: when the app has no cached Site Settings and
Sanity is unreachable, the layout renders a minimal version from `app/copy/`:

- no Navigation links;
- a footer with the copyright, Instagram and the Platform's own links;
- a Notice saying part of the editorial system is unavailable, which cannot be dismissed.

Stale Site Settings, served from the cache during an outage, show no Notice: visitors are
seeing valid content.

## Consequences

### Positive

- A Sanity outage never takes down a Platform page.
- Visitors on a degraded page are told why links are missing.

### Negative

- A second, smaller copy of the footer lives in the repository. It is kept deliberately
  minimal so there is little to drift, but an Editor's footer change never reaches it.

### Neutral

- Pages still answer with an error on a cold start with Sanity down, as before.

## Alternatives Considered

1. **No fallback: Site Settings throw like Page content**
   - Pros: one rule for all Public Site content.
   - Cons: Sanity becomes a hard dependency of payments and admin.

2. **Site Settings only on Public Site Pages; Platform pages keep a code header and footer**
   - Pros: the Platform never depends on Sanity.
   - Cons: two headers and two footers that look different and drift apart.

3. **Empty fallback: render nothing when Sanity is down**
   - Pros: no copy in the repository at all.
   - Cons: a page with no footer and no explanation reads as broken.

## References

- [No repository fallback for Public Site content](./20260924-no-repository-fallback-for-public-site-content.md)

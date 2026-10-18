# Transactional email copy falls back to code when Sanity is down

- Status: accepted
- Date: 2026-10-18
- Tags: architecture, public-site, cms, email, reliability

## Context

[No repository fallback for Public Site content](./20260924-no-repository-fallback-for-public-site-content.md)
makes Sanity the single source of truth and keeps no code copy: a cold start
during a Sanity outage serves an error page.
[Site Settings fall back to code when Sanity is down](./20260930-site-settings-fall-back-to-code-when-sanity-is-down.md)
carved out the first exception, because Site Settings render on every page, a
Platform page included.

Moving the transactional email copy to Sanity
([Email copy lives in Sanity](./20261018-email-copy-lives-in-sanity.md)) raises
the same question with a sharper edge: a payment-link email is sent from a
request, or from a database trigger with no visitor around, and it must go out.
It must never fail to send because Sanity is unreachable, slow, or publishing
copy the contract rejects.

## Decision

Transactional email copy keeps a code fallback, unlike Public Site Pages.

- The baseline copy of each email lives in one `app/copy/emails/` module — the
  same module the Studio seed and the production migration read, so there is one
  source, not a drifting duplicate.
- At send time the app reads the Sanity copy from its cache behind a short
  timeout. On any miss, timeout, or content the contract rejects, it uses the
  code copy instead. The send never throws on Sanity's account.
- The body is produced by the same renderer on both paths, so the fallback
  cannot silently diverge from what an Editor would see.

This mirrors the WhatsApp payment message
([POS-607](https://linear.app/positiv/issue/POS-607)), which already degrades to
a code default and never lets a broken message take a feature down.

## Consequences

### Positive

- A Sanity outage, a slow response, or invalid published copy never stops a
  payment email from going out — the overriding requirement for payments.
- The fallback is the same bytes the Editor started from, kept in one place.

### Negative

- A second copy of each email's baseline wording lives in the repository. An
  Editor's later change never reaches it. We accept this for transactional
  email exactly as [Site Settings](./20260930-site-settings-fall-back-to-code-when-sanity-is-down.md)
  accepts it for the footer — the alternative is a payment email that fails to
  send.

### Neutral

- Public Site Pages keep no fallback and still answer with an error on a cold
  start during an outage, as before. This exception is for transactional email
  only.

## Alternatives Considered

1. **No fallback: the email throws, like Page content**
   - Pros: one rule for all Sanity content, no duplicated copy.
   - Cons: Sanity becomes a hard dependency of sending a payment email. A send
     cannot be allowed to depend on a third party being up.

2. **Cached last-good copy only, no code fallback**
   - Pros: no copy in the repository.
   - Cons: a cold cache during an outage — right after a deploy or restart — has
     nothing to serve, and the email fails.

3. **Retry or queue the send for later**
   - Pros: no fallback copy.
   - Cons: changes the send semantics and defers an email the participant is
     waiting on; far more machinery than keeping one baseline string.

## References

- [No repository fallback for Public Site content](./20260924-no-repository-fallback-for-public-site-content.md)
- [Site Settings fall back to code when Sanity is down](./20260930-site-settings-fall-back-to-code-when-sanity-is-down.md)
- [Email copy lives in Sanity, rendered through the shared placeholder renderer](./20261018-email-copy-lives-in-sanity.md)

# Use Cloudflare Turnstile for CAPTCHA

- Status: accepted
- Date: 2025-02-03
- Tags: security, frontend, authentication

## Context

Positiv's public forms (registration, login, contact) need bot protection to prevent:

- Automated account creation
- Brute-force login attempts
- Spam submissions

**Incident that triggered this decision:** We initially used a honeypot technique for bot protection. This proved insufficient when we experienced a bot attack that created a swarm of bogus accounts, nearly overwhelming the auth database. The attack made it clear we needed a more robust CAPTCHA solution.

We needed a CAPTCHA solution that:

- Provides good bot detection
- Respects user privacy
- Has minimal friction for real users
- Works without annoying image challenges

## Decision

We use **Cloudflare Turnstile** for bot protection on public forms:

- Privacy-focused alternative to reCAPTCHA
- Invisible or managed widget modes
- Server-side verification via Cloudflare API
- No tracking cookies or fingerprinting

```tsx
// Client-side widget
<Turnstile
  siteKey={TURNSTILE_SITE_KEY}
  onSuccess={(token) => setTurnstileToken(token)}
/>

// Server-side verification
const { success } = await verifyTurnstile(token)
```

## Consequences

### Positive

- Privacy-first: no user tracking for ads
- Often invisible to legitimate users
- Fast verification (no image puzzles)
- Free tier is generous
- Works well with accessibility requirements
- GDPR-friendly
- Stopped the bot attacks we were experiencing

### Negative

- Less battle-tested than reCAPTCHA
- Requires Cloudflare account
- Some bots may still get through
- Must handle verification failures gracefully
- Widget styling options are limited

### Neutral

- Similar implementation pattern to reCAPTCHA
- Can switch to other providers if needed
- Works on all modern browsers

## Alternatives Considered

1. **Honeypot fields** (Previously used)
   - Pros: Simple, invisible, no external dependency
   - Cons: **Failed in production** - sophisticated bots bypassed it easily, leading to the attack that triggered this ADR

2. **Google reCAPTCHA v3**
   - Pros: Most widely used, good detection
   - Cons: Privacy concerns, Google tracking, user friction

3. **hCaptcha**
   - Pros: Privacy-focused, pays website owners
   - Cons: Sometimes requires image challenges

4. **Custom rate limiting**
   - Pros: No external dependency
   - Cons: Doesn't detect sophisticated bots, wouldn't have stopped distributed attacks

## References

- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Turnstile vs reCAPTCHA](https://blog.cloudflare.com/turnstile-private-captcha-alternative/)

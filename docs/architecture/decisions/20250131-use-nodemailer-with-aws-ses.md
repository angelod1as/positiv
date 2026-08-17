# Use Nodemailer with AWS SES for Email

- Status: accepted
- Date: 2025-01-31
- Tags: infrastructure, email, backend

## Context

Positiv sends transactional emails for:

- Event application confirmations
- Password reset flows
- Admin notifications
- Event reminders

We needed a reliable, cost-effective email solution that works in both development and production environments.

## Decision

We use **Nodemailer** as the email transport abstraction with:

- **AWS SES** in production (cost-effective, high deliverability)
- **Mailpit** in local development (captures emails without sending), bundled
  with local Supabase on SMTP port 54325. Superseded Mailhog on 2026-08-16,
  once Mailhog went unmaintained and left homebrew-core.
- **HTML templates** for email content

```typescript
// Email transport is environment-aware
const transport = getEmailTransport() // Returns SES or Mailpit based on env

await sendEmail({
  to: user.email,
  subject: "Inscrição confirmada",
  text: "Sua inscrição foi confirmada...",
  html: "<h1>Inscrição confirmada</h1>...",
})
```

## Consequences

### Positive

- Cost-effective: SES pricing is very low (~$0.10/1000 emails)
- High deliverability with proper SES configuration
- Same API for dev/prod (just different transports)
- Mailpit catches all local emails for easy testing
- No vendor lock-in to email marketing platforms
- Simple HTML templates - no complex tooling needed

### Negative

- SES requires initial setup (domain verification, sending limits)
- Must manage SES reputation and bounce handling
- No built-in tracking (open rates, clicks) for transactional emails
- HTML email templates require manual handling of email quirks

### Neutral

- Separate from newsletter system (Listmonk handles marketing emails)
- Can switch transports without changing application code
- Works with standard SMTP if needed

## Alternatives Considered

1. **SendGrid**
   - Pros: Easy setup, built-in analytics, good deliverability
   - Cons: Higher cost at scale, another vendor account

2. **Postmark**
   - Pros: Excellent deliverability, transactional-focused
   - Cons: More expensive, less flexible

3. **Resend**
   - Pros: Modern API, React Email integration
   - Cons: Newer service, cost adds up

4. **Direct SMTP (Gmail, etc.)**
   - Pros: Simple, no additional service
   - Cons: Rate limits, deliverability issues, not production-ready

## References

- [Nodemailer Documentation](https://nodemailer.com/)
- [AWS SES Developer Guide](https://docs.aws.amazon.com/ses/)
- [Mailpit](https://mailpit.axllent.org/) (local development)
- Related: [ADR: Use Listmonk for Newsletter Management](./20250201-use-listmonk-for-newsletters.md)

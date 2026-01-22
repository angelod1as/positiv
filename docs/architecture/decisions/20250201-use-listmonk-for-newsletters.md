# Use Listmonk for Newsletter Management

- Status: accepted
- Date: 2025-02-01
- Tags: infrastructure, email, marketing

## Context

Positiv needs to send marketing and newsletter emails:

- Event announcements to subscribers
- Post-event follow-ups
- Community updates

We needed a newsletter platform that:

- Integrates via API with our application
- Is cost-effective for a small project
- Provides campaign management, tracking, and unsubscribe handling
- Can be self-hosted for data control

## Decision

We use **Listmonk**, an open-source, self-hosted newsletter and mailing list manager:

- Hosted on our infrastructure (AWS/Docker)
- API integration for subscriber sync from Positiv
- Campaign templates and scheduling
- Built-in tracking (opens, clicks) and analytics
- GDPR-compliant unsubscribe handling

```typescript
// Sync participant to Listmonk when they opt-in
await listmonkApi.addSubscriber({
  email: participant.email,
  name: participant.name,
  lists: [MAIN_LIST_ID],
})
```

## Consequences

### Positive

- Zero recurring cost (self-hosted)
- Full data ownership and GDPR compliance
- Modern API for programmatic subscriber management
- Campaign analytics built-in
- No subscriber limits
- Can sync event participants to specific lists

### Negative

- Requires infrastructure management (hosting, updates)
- Self-hosted means we're responsible for deliverability
- Smaller community than commercial alternatives
- Must integrate with SES for actual email sending
- No drag-and-drop template builder (code templates)

### Neutral

- Separate from transactional emails (Nodemailer handles those)
- Admin UI for marketing team to manage campaigns
- Can migrate to commercial platform if needed

## Alternatives Considered

1. **Mailchimp**
   - Pros: Easy to use, powerful features, great templates
   - Cons: Expensive at scale, data not fully controlled

2. **ConvertKit**
   - Pros: Creator-focused, good automation
   - Cons: Monthly cost, less API flexibility

3. **Buttondown**
   - Pros: Simple, developer-friendly
   - Cons: Limited features, per-subscriber pricing

4. **Custom solution**
   - Pros: Exactly what we need
   - Cons: Significant development time, must build all features

## References

- [Listmonk Documentation](https://listmonk.app/docs/)
- [Listmonk GitHub](https://github.com/knadh/listmonk)
- Related: [ADR: Use Nodemailer with AWS SES for Email](./20250131-use-nodemailer-with-aws-ses.md)

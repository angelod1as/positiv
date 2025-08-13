# Product Requirements Document: Email Marketing System

## Executive Summary

The Email Marketing System enables Positiv administrators to create, schedule, and send marketing newsletters to consenting participants. The system leverages existing infrastructure (AWS SES, React Email) while adding MDX content authoring capabilities and automated scheduling.

## Problem Statement

Currently, Positiv only sends transactional emails (event confirmations, reminders). There's no way for administrators to:

- Send marketing communications about upcoming events
- Share community news and updates
- Engage with participants between events
- Build stronger community connections through regular communication

## Solution Overview

Build an integrated email marketing system that:

- Allows admins to author rich content using MDX
- Leverages existing React Email templates
- Respects user consent (allow_marketing_email flag)
- Provides scheduling and immediate send options
- Tracks send history for compliance and analytics

## User Personas

### Primary: Admin User

- **Role**: Community manager or event organizer
- **Technical Level**: Non-technical
- **Needs**:
  - Easy content creation without coding
  - Ability to schedule communications
  - View past newsletters
  - Understand delivery success

### Secondary: Participant

- **Role**: Event attendee/community member
- **Needs**:
  - Receive relevant updates
  - Easy unsubscribe process
  - Respect for email preferences

## User Flows

### Admin Flow: Creating and Sending Newsletter

1. Admin logs into platform
2. Navigates to `/admin/newsletters`
3. Views list of past newsletters (sent date, subject, recipient count)
4. Clicks "Create Newsletter"
5. Fills out form:
   - Subject line
   - Template selection (dropdown)
   - MDX content editor
   - Optional: Preview panel
6. Chooses send option:
   - Send immediately
   - Schedule for specific date/time
7. Reviews and confirms
8. System queues newsletter for processing
9. Admin sees confirmation and returns to list view

### Participant Flow: Receiving Newsletter

1. Participant receives email (if allow_marketing_email = true)
2. Email contains:
   - Newsletter content
   - Unsubscribe link at footer
3. If clicking unsubscribe:
   - Directed to unsubscribe confirmation page
   - allow_marketing_email set to false
   - Confirmation message shown

## Functional Requirements

### Step 1: Foundation (Database & Core Logic)

**Tasks: POS-205, POS-206**

#### Database Schema

##### newsletters table

```sql
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,
  content_mdx TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### newsletter_sends table

```sql
CREATE TABLE newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES newsletters(id),
  profile_id UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  UNIQUE(newsletter_id, profile_id)
);
```

##### newsletter_queue table

```sql
CREATE TABLE newsletter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES newsletters(id),
  profile_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

### Step 2: Admin Interface

**Tasks: POS-207, POS-208, POS-209**

#### Newsletter List View

- Table showing: Subject, Template, Status, Scheduled/Sent Date, Recipient Count
- Sorting and filtering capabilities
- Action buttons: View, Edit (if draft), Delete (if draft)

#### Newsletter Create/Edit Form

- Subject field (required)
- Template selector dropdown (Event Announcement, General News)
- MDX editor with:
  - Syntax highlighting
  - Basic toolbar (bold, italic, links, headings)
  - Support for custom components (EventCard, Button, etc.)
- Optional live preview panel
- Save as draft option
- Send/Schedule actions

### Step 3: Email Processing Pipeline

**Tasks: POS-210, POS-211, POS-212**

#### MDX to HTML Conversion

1. Parse MDX content
2. Render with custom component library
3. Wrap in selected React Email template
4. Convert to HTML
5. Generate plain text version

#### Sending Process

1. Query eligible recipients (allow_marketing_email = true, with segmentation)
2. Create queue entries for each recipient
3. Process queue in batches (50-100 per batch)
4. Respect SES rate limit (1 email/second)
5. Add unsubscribe token to each email
6. Track send status

#### Local Testing

- Use Mailhog for development (runs on localhost:1025)
- All emails in development environment route to Mailhog
- Access Mailhog UI at localhost:8025 to view sent emails
- E2E tests also use Mailhog for email verification

### Step 4: Processing Architecture & Scheduling

**Tasks: POS-213, POS-214**

#### Option A: Supabase Edge Functions (Initial Implementation)

```typescript
// Cron job runs every 5 minutes
export async function processNewsletterQueue() {
  // 1. Check for scheduled newsletters
  // 2. Move to 'sending' status
  // 3. Create queue entries
  // 4. Process in batches
  // 5. Update statuses
}
```

#### Option B: AWS Lambda (Future Migration - see POS-218)

- Longer execution time
- SQS for queue management
- Better for scale (though current 600 profiles, max 5000 is manageable)

### Step 5: Analytics & Audience Segmentation

**Tasks: POS-215, POS-216**

#### Basic Analytics

- Total sends per newsletter
- Success/failure rates
- Unsubscribe tracking

#### Audience Segmentation (Must Have)

- All subscribers
- Veterans only (is_veteran = true)
- Newbies only (is_veteran = false)
- By event attendance count
- By location
- By gender/orientation

### Step 6: Testing & Documentation

**Task: POS-217**

- E2E tests using Mailhog
- Admin documentation
- MDX component reference

## Technical Architecture

### Component Structure

```sh
/app
  /components
    /email
      /templates
        /newsletter
          /event-announcement.tsx
          /general-news.tsx
  /business
    /admin
      /newsletter
        /newsletter.server.ts
        /mdx-processor.ts
        /send-queue.ts
  /pages
    /admin
      /newsletters
        /index.tsx (list view)
        /new.tsx (create form)
        /[id].tsx (edit form)
```

### MDX Component Library

- EventCard: Display event information
- Button: CTA buttons
- Divider: Section separators
- Quote: Testimonials

### Email Templates (React Email)

1. **Event Announcement**: Template for promoting upcoming events
2. **General News**: Template for community updates and news

## Non-Functional Requirements

### Performance

- Newsletter list loads in < 2 seconds
- MDX preview updates in < 500ms
- Batch processing handles 1000 recipients in < 20 minutes

### Security

- Admin-only access to newsletter features
- Unsubscribe tokens are cryptographically secure
- Rate limiting on unsubscribe endpoint
- SQL injection prevention via Kysely

### Scalability

- Current scale: ~600 profiles
- Maximum expected: 5,000 profiles
- Queue system easily handles this scale
- Database indexes on frequently queried fields
- AWS Lambda migration path available if needed (POS-218)

### Compliance

- Unsubscribe link in every marketing email
- Respect allow_marketing_email preference
- Send history retained for audit purposes
- LGPD compliance for Brazilian users

## Success Metrics

### Launch Metrics (First 30 days)

- System successfully sends first newsletter
- No critical bugs in production
- Admin can complete full flow without support

### Ongoing Metrics

- Newsletter creation time < 30 minutes
- Delivery success rate > 95%
- Unsubscribe rate < 5%
- Admin satisfaction score > 4/5

## Implementation Steps

### Step 1: Foundation (POS-205, POS-206)

- Database migrations
- Kysely types and repositories
- Basic CRUD operations

### Step 2: Admin UI (POS-207, POS-208, POS-209)

- Newsletter list view
- Create/edit forms
- MDX editor integration
- React Email templates

### Step 3: Email Pipeline (POS-210, POS-211, POS-212)

- MDX processing
- Template integration
- Send queue implementation
- Unsubscribe functionality

### Step 4: Scheduling & Processing (POS-213, POS-214)

- Supabase Edge Function setup
- Cron job configuration
- Immediate send capability

### Step 5: Analytics & Segmentation (POS-215, POS-216)

- Send statistics tracking
- Audience segmentation (must have)

### Step 6: Testing & Documentation (POS-217)

- E2E testing with Mailhog
- Admin documentation
- Performance testing

## Risks and Mitigations

| Risk                  | Impact           | Mitigation                        |
| --------------------- | ---------------- | --------------------------------- |
| SES rate limiting     | Delayed sends    | Implement proper queue throttling |
| Large recipient lists | Timeout issues   | Batch processing, consider Lambda |
| MDX parsing errors    | Failed sends     | Validation and error handling     |
| Unsubscribe abuse     | Lost subscribers | Rate limiting, confirmation step  |

## Decisions Made

1. ~~Should we add image upload capabilities for newsletters?~~ No, not needed
2. ~~Do we need approval workflow for newsletters?~~ No, not needed
3. ~~Should we track email opens/clicks initially?~~ No, basic analytics only
4. ~~What's the maximum recipient list size to support?~~ 5,000 profiles max
5. ~~Personalization needed?~~ No, generic emails without {name} variables
6. ~~A/B testing needed?~~ No, not required
7. **Templates needed:** Event Announcement and General News only

## Appendix

### Example MDX Content

```mdx
# Novidades do Positiv! 🎉

Olá pessoal!

Temos ótimas notícias para compartilhar com nossa comunidade.

<EventCard 
  title="Festa de Verão"
  date="2025-02-15"
  spots={50}
/>

## O que vem por aí

- Novas funcionalidades no site
- Eventos especiais
- Parcerias incríveis

<Button href="https://positiv.com/events">
  Ver Todos os Eventos
</Button>

---

*Abraços,*  
*Equipe Positiv*
```

### References

- [React Email Documentation](https://react.email)
- [MDX Documentation](https://mdxjs.com)
- [AWS SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)

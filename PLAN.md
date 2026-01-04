# POS-314: Group Closing Email Implementation Plan

**⚠️ DELETE THIS FILE WHEN PR MERGES ⚠️**

Full detailed plan at: `/Users/angelodias/.claude/plans/ticklish-moseying-unicorn.md`

## Overview

Send a transactional email on `time_group_start` (4 days before event) to all non-rejected participants, announcing that the group is closed and the approval process has ended.

**Message**: "Quem entrou, entrou. Quem não entrou, que peninha" (Who's in is in, who's not in won't be added)

**Recipients**: All participants EXCEPT `approved_to_attend = 'rejected'`
- Includes: `pending`, `approved`, `approved_with_reservations`
- Single unified email for all recipients

## Architecture Decision

✅ **Generic `event_transactional_emails` table** with `email_type` column
- First type: `'group_closing'`
- Future types: `'payment_reminder'`, `'attendance_confirmation'`, etc.
- Keeps existing `event_newsletter_campaigns` untouched (for Listmonk campaigns)
- Clean separation: Campaigns (Listmonk) vs Transactional (Nodemailer)

## Progress Tracker

### ✅ Phase 1: Database Migration & Tracking Infrastructure (COMPLETED)

**1.1 - Migration**
- ✅ File: `supabase/migrations/20260104181500_create_event_transactional_emails.sql`
- ✅ Created generic `event_transactional_emails` table
- ✅ Columns: id, event_id, email_type, emails_sent, sent_time, recipient_count, times_attempted, last_error
- ✅ UNIQUE constraint on (event_id, email_type) for idempotency
- ✅ Indexes for querying pending emails
- ✅ Tested with `supabase db reset` ✅

**1.2 - Tracking Tests (RED)**
- ✅ File: `app/business/email/group-closing-tracking.server.integration.test.ts`
- ✅ 8 test cases covering all CRUD operations
- ✅ Tests: createGroupClosingTracking, getPendingGroupClosingEmails, updateGroupClosingSent, updateGroupClosingError
- ✅ Tests idempotency, retry limits (max 3), error logging

**1.3 - Tracking Helpers (GREEN)**
- ✅ File: `app/business/email/group-closing-tracking.server.ts`
- ✅ Implemented with Kysely + composable-functions pattern
- ✅ Functions: createGroupClosingTracking, getPendingGroupClosingEmails, updateGroupClosingSent, updateGroupClosingError
- ✅ All 123 integration tests passing ✅

**Commits:**
- ✅ `0387e028` - feat(email): add generic event transactional emails tracking table
- ✅ `2978156b` - test(email): add group closing tracking integration tests + feat(email): implement group closing tracking helpers

### ⏳ Phase 2: Email Template (NEXT)

**2.1 - RED: Email template tests**
- File: `app/business/email/templates/group-closing-mail.template.test.ts`
- Tests: HTML structure, Portuguese content, event data interpolation, XSS sanitization
- Pattern: Copy `application-mail.template.test.ts`

**2.2 - GREEN: Implement template**
- File: `app/business/email/templates/group-closing-mail.template.ts`
- Purple gradient background (#4a75d2 to #bf03c3)
- H1: "Fechamos o grupo! 🔒"
- Body: "Quem entrou, entrou. Quem não entrou, que peninha! 😢"
- Sanitize all user fields with sanitizeHtml()

**2.3 - REFACTOR: Polish content**

### 📋 Phase 3: Email Sending Logic

**3.1 - RED: Formatter unit test**
- File: `app/business/email/format-group-closing-mail.test.ts`
- Test: HTML to plain text conversion

**3.2 - GREEN: Implement formatter**
- File: `app/business/email/format-group-closing-mail.tsx`
- Use htmlToText() utility
- Pattern: Copy `format-application-mail.tsx`

**3.3 - RED: Send emails integration test**
- File: `app/business/email/send-group-closing-emails.server.integration.test.ts`
- Tests: participant query filtering, email sending, tracking, error handling
- Edge cases: no participants, all rejected, null time_group_start

**3.4 - GREEN: Implement send function**
- File: `app/business/email/send-group-closing-emails.server.ts`
- Query participants (exclude rejected, only non-null emails)
- Format and send emails via Nodemailer
- Update tracking with sent count or error

**3.5 - REFACTOR: Extract patterns**

### 📋 Phase 4: Cron Trigger Integration

**4.1 - RED: Add trigger to cron**
- File: `supabase/migrations/[TS]_add_group_closing_tracking_trigger.sql`
- Extend `update_event_statuses_automatically()` function
- Check: `time_group_start <= NOW() AND time_group_start > NOW() - INTERVAL '24 hours'`
- Insert tracking rows with ON CONFLICT DO NOTHING

**4.2 - GREEN: Update process-campaigns API**
- File: `app/routes/api.process-campaigns.ts`
- After newsletter campaign processing, add group closing email processing
- Call `getPendingGroupClosingEmails()` and `sendGroupClosingEmailsForEvent()`

**4.3 - REFACTOR: Consider shared patterns**

### 📋 Phase 5: Integration & Types

**5.1 - Regenerate types**
- Run: `pnpm db:types --local`

**5.2 - RED: End-to-end integration test**
- File: `app/business/email/group-closing-emails-e2e.integration.test.ts`
- Full flow: create event + participants → trigger → send → verify
- Verify: 4 emails sent (exclude rejected), tracking updated

**5.3 - GREEN: Make test pass**

### 📋 Phase 6: News Dialog

**6.1 - Update news dialog**
- File: `app/components/organisms/news-dialog/news.tsx`
- Add item in Brazilian Portuguese
- Title: "Email automático no fechamento do grupo"
- Content: "Agora enviamos emails automáticos quando o grupo fecha (4 dias antes do evento)"
- isAdmin: true
- Remove items older than 2 weeks

**6.2 - Update NEWS_VERSION**
- File: `app/lib/helpers/constants.ts`
- Set: `NEWS_VERSION = Date.now()`

## Key Database Query

```typescript
// Recipients: All participants EXCEPT rejected
SELECT DISTINCT p.id, p.email, p.social_name, p.full_name
FROM event_participants ep
JOIN profiles p ON ep.profile_id = p.id
WHERE ep.event_id = ?
  AND ep.approved_to_attend != 'rejected'
  AND p.email IS NOT NULL
```

## Critical Files

### Created
- ✅ `supabase/migrations/20260104181500_create_event_transactional_emails.sql`
- ✅ `app/business/email/group-closing-tracking.server.ts`
- ✅ `app/business/email/group-closing-tracking.server.integration.test.ts`
- ⏳ `app/business/email/templates/group-closing-mail.template.ts`
- ⏳ `app/business/email/templates/group-closing-mail.template.test.ts`
- ⏳ `app/business/email/format-group-closing-mail.tsx`
- ⏳ `app/business/email/format-group-closing-mail.test.ts`
- ⏳ `app/business/email/send-group-closing-emails.server.ts`
- ⏳ `app/business/email/send-group-closing-emails.server.integration.test.ts`
- ⏳ `app/business/email/group-closing-emails-e2e.integration.test.ts`
- ⏳ `supabase/migrations/[TS]_add_group_closing_tracking_trigger.sql`

### To Modify
- ⏳ `app/routes/api.process-campaigns.ts` - Add group closing email processing
- ⏳ `app/components/organisms/news-dialog/news.tsx` - Add news item
- ⏳ `app/lib/helpers/constants.ts` - Update NEWS_VERSION

## Definition of Done

- [ ] All tests green (unit + integration + e2e)
- [ ] Linter passes (`pnpm lint`)
- [ ] Database types regenerated
- [ ] News dialog updated
- [ ] NEWS_VERSION incremented
- [ ] PR follows template with Linear ticket
- [ ] `event_newsletter_campaigns` untouched and working

## Future Email Types

To add new transactional email types:
1. Update CHECK constraint: `CHECK (email_type IN ('group_closing', 'payment_reminder', ...))`
2. Create new email template
3. Add trigger logic to cron function
4. Add processing to `/api/process-campaigns`

**No new tables needed!** Just add enum values and implement email-specific logic.

# Newsletter Event Automation

Documentation for automated newsletter campaigns when events open registration.

## Event Opening Trigger Mechanism

### Overview

Events automatically transition from `Scheduled` to `Registration Open` status via a PostgreSQL cron job that runs every 5 minutes.

### Cron Job Details

**Job Name:** `update-event-statuses-automatically`

**Frequency:** `*/5 * * * *` (every 5 minutes)

**Database Function:** `public.update_event_statuses_automatically()`

**Migration Files:**
- `supabase/migrations/20250902011626_setup_event_scheduling_cron.sql` - Cron job setup
- `supabase/migrations/20250902011555_create_auto_publish_function.sql` - Function definition
- `supabase/migrations/20250902011530_add_auto_publish_column.sql` - Auto-publish column

**TypeScript Wrapper:** `app/business/admin/event-scheduling.server.ts`

### Status Transition Logic

Events transition from `Scheduled` → `Registration Open` when **ALL** conditions are met:

1. `event_status = 'Scheduled'` - Event must be in scheduled state
2. `auto_publish = true` - Auto-publishing must be enabled
3. `time_application_start <= NOW()` - Registration time has arrived
4. `time_event_start > NOW()` - Event hasn't started yet (prevents opening past events)
5. `time_application_start IS NOT NULL` - Registration start time is set
6. `time_event_start IS NOT NULL` - Event start time is set

### Database Schema

**Events Table Key Fields:**

```sql
event_status       - ENUM('Draft', 'Scheduled', 'Registration Open',
                          'Registration Closed', 'Completed', 'Cancelled')
auto_publish       - BOOLEAN (default: true for new events)
time_application_start - TIMESTAMPTZ (when registration opens)
time_application_end   - TIMESTAMPTZ (when registration closes)
time_event_start       - TIMESTAMPTZ (when the event starts)
```

### Performance Optimization

Optimized index exists for the auto-publish query:

```sql
CREATE INDEX idx_events_auto_publish_status
ON events(event_status, auto_publish, time_application_start)
WHERE event_status = 'Scheduled' AND auto_publish = true;
```

## Hook Point for Newsletter Automation (POS-257)

### Current State

**No existing triggers** fire when `event_status` changes from `Scheduled` to `Registration Open`.

The only existing trigger pattern in the database is on `event_participants` table for veteran status updates.

### Recommended Approach for POS-257

Create a PostgreSQL trigger that fires `AFTER UPDATE` on the `events` table when the status transitions to `Registration Open`:

```sql
CREATE OR REPLACE FUNCTION notify_newsletter_event_opened()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes from Scheduled to Registration Open
  IF OLD.event_status = 'Scheduled' AND NEW.event_status = 'Registration Open' THEN
    -- Call newsletter campaign creation function
    -- Implementation in POS-257
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_newsletter_event_opened
AFTER UPDATE ON events
FOR EACH ROW
WHEN (OLD.event_status IS DISTINCT FROM NEW.event_status)
EXECUTE FUNCTION notify_newsletter_event_opened();
```

### Alternative Approach

Modify the `update_event_statuses_automatically()` function to also trigger newsletter campaigns after updating event statuses. This keeps all automation logic centralized.

## Testing

Integration tests exist at: `app/business/admin/event-scheduling.integration.test.ts`

Follow the same testing pattern for newsletter automation tests.

## Status Check Helper

Helper function available at: `app/lib/helpers/check-event-status.ts`

```typescript
export const checkEventStatus = (event_status: EventStatus) => ({
  isScheduled: event_status === "Scheduled",
  isClosed: event_status === "Registration Closed",
  isOpen: event_status === "Registration Open",
})
```

## Campaign Template

Event opening emails use `event-opening.template.html` (duplicate of default wrapper).
Template ID 7 stored in `LISTMONK_EVENT_OPENING_TEMPLATE_ID` constant.
Campaign body (event data) gets injected via `{{ template "content" . }}` placeholder.

## Implementation Timeline

- **POS-256** ✓ - Trigger documentation + Listmonk template creation
- **POS-257** - Automated campaign creation + trigger integration

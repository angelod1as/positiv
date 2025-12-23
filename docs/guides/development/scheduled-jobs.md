# Scheduled Jobs Guide

Auto-publish events and send reminder emails using node-cron.

## Quick Reference

**What it does:** Every 5 minutes, checks for scheduled events ready to open registration and sends reminder emails.

**Requirements:**

- `NODE_ENV=production`
- `ENABLE_EVENT_SCHEDULER=true`

**Monitor:** `[Scheduler]` messages in application logs

---

## Implementation

### 1. Install Dependencies

```bash
pnpm add node-cron
pnpm add -D @types/node-cron
```

### 2. Create Business Logic

**File:** `app/business/admin/event-auto-publish.server.ts`

```typescript
import { kysely } from "~/kysely"
import { sendEventReminders } from "./admin.server"

export async function checkAndPublishEvents() {
  // Find events ready to publish
  const events = await kysely
    .selectFrom("events")
    .select(["id", "title"])
    .where("event_status", "=", "Scheduled")
    .where("auto_publish", "=", true)
    .where("time_application_start", "<=", new Date().toISOString())
    .where("time_event_start", ">", new Date().toISOString())
    .execute()

  const results = { published: [], emailsSent: [], errors: [] }

  for (const event of events) {
    try {
      // Publish event
      await kysely
        .updateTable("events")
        .set({ event_status: "Registration Open" })
        .where("id", "=", event.id)
        .execute()

      results.published.push(event.id)
      console.info(`[Scheduler] Published: ${event.title}`)

      // Send reminders
      await sendEventReminders({
        event_id: event.id,
        event_status: "Registration Open",
        intent: "send-reminders",
      })

      results.emailsSent.push(event.id)
    } catch (error) {
      results.errors.push(`${event.title}: ${error}`)
      console.error(`[Scheduler] Error:`, error)
    }
  }

  return results
}
```

### 3. Create Scheduler Service

**File:** `app/services/event-scheduler.server.ts`

```typescript
import cron from "node-cron"
import { checkAndPublishEvents } from "~/business/admin/event-auto-publish.server"

let task: cron.ScheduledTask | null = null

export function startEventScheduler() {
  if (task) return
  if (process.env.NODE_ENV !== "production") return
  if (process.env.ENABLE_EVENT_SCHEDULER !== "true") return

  console.info("[Scheduler] Starting event auto-publish scheduler")

  task = cron.schedule("*/5 * * * *", async () => {
    console.info("[Scheduler] Running check")
    const results = await checkAndPublishEvents()
    console.info("[Scheduler] Completed:", results)
  })
}
```

### 4. Initialize in App

**File:** `app/entry.server.tsx`

```typescript
import { startEventScheduler } from "~/services/event-scheduler.server"

// Add at top level
if (typeof global !== "undefined") {
  startEventScheduler()
}
```

### 5. Add Manual Trigger Endpoint

**File:** `app/routes/api/admin/auto-publish-events.ts`

```typescript
import { checkAndPublishEvents } from "~/business/admin/event-auto-publish.server"
import { requireAdmin } from "~/business/auth/auth.server"

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request)
  const results = await checkAndPublishEvents()
  return Response.json({ success: true, ...results })
}
```

### 6. Environment Variables

```bash
ENABLE_EVENT_SCHEDULER=true
```

---

## Testing

### Integration Test

**File:** `app/business/admin/event-auto-publish.integration.test.ts`

```typescript
import { describe, expect, it, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"
import { checkAndPublishEvents } from "./event-auto-publish.server"

describe("Event Auto-Publish", () => {
  const { tracker, kysely } = setupIntegrationTest()

  afterEach(() => cleanupAfterTest(tracker, kysely))

  it("publishes event when time reached", async () => {
    const event = await createTestEvent(tracker, kysely, {
      event_status: "Scheduled",
      auto_publish: true,
      time_application_start: new Date(Date.now() - 1000).toISOString(),
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })

    const results = await checkAndPublishEvents()

    expect(results.published).toContain(event.id)

    const updated = await kysely
      .selectFrom("events")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()

    expect(updated.event_status).toBe("Registration Open")
  })

  it("ignores events with auto_publish=false", async () => {
    const event = await createTestEvent(tracker, kysely, {
      event_status: "Scheduled",
      auto_publish: false,
      time_application_start: new Date(Date.now() - 1000).toISOString(),
    })

    const results = await checkAndPublishEvents()
    expect(results.published).not.toContain(event.id)
  })
})
```

### Manual Testing

```bash
# As admin, trigger manually
POST /api/admin/auto-publish-events
```

---

## Monitoring

### Expected Log Messages

```
[Scheduler] Starting event auto-publish scheduler
[Scheduler] Running check
[Scheduler] Found 2 event(s) to publish
[Scheduler] Published: Summer Party
[Scheduler] Completed: {published: ["abc-123"], emailsSent: ["abc-123"], errors: []}
```

### Check Logs in Coolify

```bash
# In Coolify dashboard → Logs tab
# Filter for: [Scheduler]
```

---

## Troubleshooting

### Scheduler Not Running

**Check environment variables in Coolify:**

- `NODE_ENV=production`
- `ENABLE_EVENT_SCHEDULER=true`

**Restart service** after changing variables.

### Events Not Publishing

**Event must meet ALL criteria:**

- `event_status = 'Scheduled'`
- `auto_publish = true`
- `time_application_start <= NOW()`
- `time_event_start > NOW()`

**Verify with SQL:**

```sql
SELECT id, title, event_status, auto_publish,
       time_application_start, time_event_start
FROM events
WHERE event_status = 'Scheduled' AND auto_publish = true;
```

### Emails Not Sending

**Check reminders exist:**

```sql
SELECT COUNT(*) FROM event_reminders
WHERE event_id = 'xxx' AND email_sent = false;
```

**Check email config:**

- Verify AWS SES credentials in environment variables
- Check logs for email errors

---

## Migration from pg_cron

Current Supabase setup uses `pg_cron` with function `update_event_statuses_automatically()`.

### Steps

1. Deploy node-cron implementation
2. Monitor for 1-2 weeks (both running is safe)
3. Disable pg_cron: `SELECT cron.unschedule('update-event-statuses-automatically');`

### Why node-cron?

- ✅ Sends reminder emails automatically
- ✅ Works with any database (not Supabase-specific)
- ✅ Easy integration testing
- ✅ Visible in application logs
- ✅ Manual trigger endpoint
- ✅ Portable across platforms

---

## Cron Schedule Reference

```
*/5 * * * *  = Every 5 minutes
0 * * * *    = Every hour
0 0 * * *    = Daily at midnight
0 2 * * *    = Daily at 2 AM
```

[Full reference: crontab.guru](https://crontab.guru/)

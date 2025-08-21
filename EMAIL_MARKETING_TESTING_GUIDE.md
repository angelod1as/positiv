# Email Marketing System - Complete Testing Guide

## SETUP (You'll need to do this)
1. **Terminal 1**: `pnpm dev` (starts dev server on port 5173)
2. **Terminal 2**: `pnpm email:test` (starts Mailhog)
3. **Browser Tab 1**: http://localhost:5173 (main app)
4. **Browser Tab 2**: http://localhost:8025 (Mailhog UI to see emails)

## STEP-BY-STEP TESTING

### Part 1: Access Newsletter System
1. Go to http://localhost:5173/login
2. Login with admin credentials
3. Click "Admin" in the navigation
4. Click "Newsletters" in the admin menu
5. **VERIFY**: You should see the newsletter list page

### Part 2: Create a Newsletter
1. Click "Create Newsletter" button
2. Fill in:
   - **Subject**: "Test Newsletter - December Updates"
   - **Template**: Select "General News"
   - **Content**: Use this MDX example:
   ```mdx
   # December Updates at Positiv

   Welcome to our monthly newsletter!

   <EventCard>
   ## Upcoming Event
   Join us for our year-end celebration on December 20th!
   </EventCard>

   <Button href="/events">View All Events</Button>

   <Divider />

   <Quote>
   "Community is everything" - Positiv Team
   </Quote>
   ```
3. Click "Save as Draft"
4. **VERIFY**: Newsletter appears in list with "Draft" status

### Part 3: Test Basic Segmentation (Phase 1)
1. Edit the draft newsletter
2. In "Audience" section, test each segment:
   - Select "All Marketing Subscribers" → Check recipient count
   - Select "Veterans Only" → Count should decrease
   - Select "Newbies Only" → Different count
   - Select "Never Attended Any Event" → Different count
   - Select "Has Attended At Least One Event" → Different count
   - Select "New Registrations (30 days)" → Different count
   - Select "Applied But Never Attended" → Different count
3. **VERIFY**: 
   - Each segment shows different recipient counts
   - Preview shows 5 sample recipients
   - "Exclude rejected participants" checkbox is checked by default

### Part 4: Test Advanced Segmentation (Phase 2)
1. Click "Show Advanced Filters"
2. Test individual advanced filters:
   - **Inactive Users**: Attended event >6 months ago, nothing since
   - **Recent Attendees**: Attended in last 3 months
   - **Frequent Attendees**: Attended 3+ events total
   - **One-Time Attendees**: Attended exactly 1 event
   - **Custom Date Range**: "Attended between Nov 1 - Dec 1"
   - **Lapsed Users**: Previously active (3+ events) but inactive 6+ months
   - **Event-Specific**: "Attended [specific event name]"
3. Test combining filters:
   - Veterans + Recent Attendees
   - Newbies + Never Attended
   - Frequent Attendees + Custom Date Range
4. **VERIFY**: 
   - Filters combine correctly (AND logic)
   - Preview updates with each change
   - Recipient count is accurate

### Part 5: Send Newsletter Immediately
1. Select "All Marketing Subscribers"
2. Ensure "Exclude rejected participants" is checked
3. Click "Send Now"
4. Confirm in dialog
5. **VERIFY**: 
   - Progress indicator appears
   - Status changes to "Sending" then "Sent"
   - Go to Mailhog (localhost:8025) - emails should appear
   - Each email has unsubscribe link at bottom
   - All emails use the same template (no personalization)

### Part 6: Test Scheduled Newsletter
1. Create another newsletter
2. Select "Schedule for later"
3. Pick a date/time 5 minutes in future
4. Save and schedule
5. **VERIFY**: Shows as "Scheduled" in list
6. Wait for scheduled time (cron runs every 5 minutes)
7. **VERIFY**: 
   - Status changes to "Sending" at scheduled time
   - Emails appear in Mailhog after processing

### Part 7: Test Unsubscribe
1. Open any newsletter email in Mailhog
2. Click the unsubscribe link at bottom
3. **VERIFY**: 
   - Unsubscribe confirmation page appears
   - Shows success message
   - Profile's `allow_marketing_email` is now false
   - User excluded from future newsletter recipients

### Part 8: Check Analytics
1. Go back to newsletter list
2. Click on a sent newsletter
3. **VERIFY** you can see:
   - Total recipients count
   - Successful sends
   - Failed sends (if any)
   - Delivery rate percentage
   - Unsubscribe count
   - Send duration
   - Average time per email

### Part 9: Test Edge Cases
1. **Empty Segment**: Create segment with no matching profiles
   - Should show "0 recipients" warning
2. **Large Recipient List**: Select all subscribers
   - Should handle 500+ recipients smoothly
3. **Invalid MDX**: Enter broken MDX syntax
   - Should show error message
4. **Schedule in Past**: Try scheduling for yesterday
   - Should show validation error

## TEACHING POINTS FOR YOUR TEAM

### Key Features to Highlight
1. **Two-Phase Segmentation**:
   - Phase 1: Basic filters (veteran status, attendance)
   - Phase 2: Advanced time-based and frequency filters
2. **No Personalization**: All emails are identical for simplicity
3. **Automatic Exclusions**: Rejected participants filtered by default
4. **MDX Power**: Rich content with custom components
5. **Compliance Built-in**: Every email has unsubscribe link

### Best Practices
1. **Always Preview**: Check 5 sample recipients before sending
2. **Test Segments**: Start with small test segments
3. **Use Templates Consistently**: Event announcements vs general news
4. **Monitor Analytics**: Track engagement over time
5. **Respect Unsubscribes**: System handles automatically

### Available MDX Components
- `<EventCard>`: Highlight upcoming events
- `<Button href="">`: Call-to-action buttons
- `<Divider />`: Visual separation
- `<Quote>`: Testimonials or highlights
- Standard markdown: Headers, lists, links, bold, italic

## COMMON ISSUES & SOLUTIONS

### Problem: No recipients showing
**Solution**: Check that test profiles have `allow_marketing_email = true`

### Problem: Emails not appearing in Mailhog
**Solution**: 
- Ensure `pnpm email:test` is running
- Check localhost:8025 is accessible
- Verify EMAIL_HOST=localhost in .env

### Problem: Scheduled emails not sending
**Solution**: 
- Cron job runs every 5 minutes, be patient
- Check Supabase Edge Function logs
- Verify scheduled_at is in the past

### Problem: MDX preview not working
**Solution**:
- Validate MDX syntax (close all tags)
- Check for special characters that need escaping
- Use the MDX playground to test complex content

### Problem: Segmentation counts seem wrong
**Solution**:
- Remember rejected participants are excluded
- Check the actual data in profiles/event_participants
- Verify date ranges are correct

### Problem: Unsubscribe link not working
**Solution**:
- Check the token generation in the email
- Verify the unsubscribe route is accessible
- Check rate limiting isn't blocking requests

## DATABASE QUERIES FOR VERIFICATION

If you need to verify data directly:

```sql
-- Check marketing subscribers
SELECT COUNT(*) FROM profiles WHERE allow_marketing_email = true;

-- Check veterans
SELECT COUNT(*) FROM profiles WHERE is_veteran = true AND allow_marketing_email = true;

-- Check attendance
SELECT DISTINCT profile_id FROM event_participants 
WHERE attendance_status = 'attended';

-- Check rejected (should be excluded)
SELECT COUNT(DISTINCT profile_id) FROM event_participants 
WHERE attendance_status = 'rejected';
```

## PERFORMANCE EXPECTATIONS

- **Small lists (<100)**: Instant sending
- **Medium lists (100-500)**: 1-8 minutes (rate limited)
- **Large lists (500-2000)**: 8-30 minutes (rate limited)
- **SES Rate Limit**: 1 email per second (configurable)

## SYSTEM ARCHITECTURE OVERVIEW

1. **Admin creates newsletter** → Saved to database
2. **Admin selects segment** → Query filters profiles
3. **Admin sends/schedules** → Creates queue entries
4. **Queue processor** → Sends emails via AWS SES
5. **Rate limiting** → 1 email/second to respect SES
6. **MDX processing** → Converts to HTML for each batch
7. **Unsubscribe tokens** → Unique per recipient
8. **Analytics tracking** → Updates after each send

This system is designed to handle Positiv's current scale (600 profiles) and can grow to 5,000+ profiles without issues.
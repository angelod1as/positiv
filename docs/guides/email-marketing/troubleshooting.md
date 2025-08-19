# Newsletter System Troubleshooting Guide

## Common Issues and Solutions

### Newsletter Creation Issues

#### "Newsletter won't save as draft"
**Symptoms**: 
- Save button doesn't work
- Loading spinner never stops
- Error message appears

**Solutions**:
1. Check all required fields are filled:
   - Subject line (required)
   - Template selection (required)
   - MDX content (required)
2. Verify MDX syntax is valid (no unclosed tags)
3. Refresh the page and try again
4. Check browser console for specific errors

#### "Preview shows error or blank"
**Symptoms**:
- Preview modal is empty
- Error message in preview
- Components not rendering

**Solutions**:
1. Validate MDX syntax:
   ```mdx
   <!-- Correct -->
   <EventCard title="Test" date="2025-01-01" location="Here" spots={50} />
   
   <!-- Wrong - missing closing -->
   <EventCard title="Test" date="2025-01-01" location="Here" spots={50}>
   ```
2. Check component props are correct type:
   - `spots={50}` not `spots="50"`
   - All required props present
3. Remove components one by one to isolate issue
4. Try with simple markdown first

#### "Can't select segmentation options"
**Symptoms**:
- Dropdowns not working
- Checkboxes disabled
- Options not appearing

**Solutions**:
1. Ensure at least one template is selected
2. Check if form is still loading
3. Verify you have admin permissions
4. Try different browser or incognito mode

### Sending Issues

#### "Newsletter stuck in 'Sending' status"
**Symptoms**:
- Status shows "Sending" for > 30 minutes
- No emails received
- No error messages

**Solutions**:
1. Check recipient count - large lists take time
2. Verify email service (AWS SES) is operational
3. Check for rate limiting (1 email/second)
4. Contact technical support if > 1 hour

**Expected Processing Times**:
- 100 recipients: ~2 minutes
- 500 recipients: ~10 minutes
- 1000 recipients: ~20 minutes
- 2000+ recipients: ~40 minutes

#### "No recipients found"
**Symptoms**:
- Recipient count shows 0
- Send button disabled
- Warning message appears

**Possible Causes**:
1. **Too restrictive filters**: Loosen segmentation
2. **No marketing consent**: Users haven't opted in
3. **All users unsubscribed**: Check unsubscribe rates
4. **Database issue**: Contact support

**Solutions**:
```
Try these in order:
1. Select "All Subscribers" (no segmentation)
2. If still 0, check database for allow_marketing_email = true
3. Verify users exist in system
4. Check for recent mass unsubscribe
```

#### "Failed to send - Error message"
**Common Error Messages and Fixes**:

| Error | Meaning | Solution |
|-------|---------|----------|
| "Invalid sender" | Email configuration issue | Verify sender email in settings |
| "Rate limit exceeded" | Too many emails too fast | Wait and retry, system auto-throttles |
| "Invalid recipient" | Bad email address | System auto-skips invalid emails |
| "Template error" | MDX rendering failed | Fix MDX content and retry |
| "Quota exceeded" | AWS SES limit reached | Contact support for limit increase |

### Scheduling Issues

#### "Scheduled newsletter didn't send"
**Symptoms**:
- Past scheduled time but still "Scheduled"
- No emails received at scheduled time

**Checklist**:
1. Verify scheduled time was in future when set
2. Check timezone settings (uses UTC)
3. Ensure cron job is running (admin only)
4. Check for system maintenance windows

**Cron Schedule**: Runs every 5 minutes
- :00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55

#### "Can't change scheduled time"
**Symptoms**:
- Edit button disabled
- Schedule fields locked

**Solutions**:
1. Newsletter must be in "Scheduled" status
2. Cannot edit if < 5 minutes to send time
3. Cannot edit already sent newsletters
4. Try canceling and rescheduling

### Segmentation Issues

#### "Segment count doesn't match expectations"
**Symptoms**:
- Recipient count seems wrong
- Missing expected recipients
- Including unexpected recipients

**Debugging Steps**:
1. **Check filter logic**: Filters use AND, not OR
2. **Verify user data**:
   ```sql
   -- Check veteran status
   SELECT COUNT(*) FROM profiles 
   WHERE is_veteran = true 
   AND allow_marketing_email = true;
   
   -- Check activity
   SELECT COUNT(DISTINCT profile_id) 
   FROM event_participants 
   WHERE status = 'approved';
   ```
3. **Test with known profiles**: Use test accounts
4. **Check exclusions**: Rejected users excluded by default

#### "Advanced filters not working"
**Symptoms**:
- Phase 2 filters not applying
- Activity status incorrect
- Date ranges ignored

**Solutions**:
1. Ensure Phase 2 features are enabled
2. Check date format (YYYY-MM-DD)
3. Verify attendance data exists
4. Use one filter at a time to isolate

### Email Delivery Issues

#### "Emails going to spam"
**Symptoms**:
- Recipients report emails in spam
- Low open rates
- Delivery warnings

**Prevention**:
1. **Subject line best practices**:
   - Avoid: FREE, URGENT, $$$, excessive !!!
   - Use: Clear, honest descriptions
2. **Content guidelines**:
   - Balance text and images
   - Include unsubscribe link
   - Avoid link shorteners
3. **Technical checks**:
   - SPF records configured
   - DKIM signing enabled
   - Clean email list (remove bounces)

#### "Some recipients not receiving emails"
**Debugging Process**:
```
1. Check recipient's allow_marketing_email = true
2. Verify email address is valid
3. Check newsletter_sends table for status
4. Look for bounce notifications
5. Ask recipient to check spam folder
6. Verify not in unsubscribe list
```

#### "Unsubscribe link not working"
**Symptoms**:
- Click leads to error page
- Token invalid message
- Unsubscribe not processed

**Solutions**:
1. Check token generation in newsletter
2. Verify unsubscribe page route exists
3. Test with fresh newsletter
4. Check database for token records

### MDX Content Issues

#### "MDX component not rendering"
**Common Mistakes**:
```mdx
<!-- Wrong: String instead of number -->
<EventCard spots="50" />

<!-- Correct: Number in braces -->
<EventCard spots={50} />

<!-- Wrong: Missing required props -->
<EventCard title="Event" />

<!-- Correct: All required props -->
<EventCard 
  title="Event" 
  date="2025-01-01" 
  location="Place" 
  spots={50} 
/>

<!-- Wrong: Unclosed component -->
<Button href="link">Text

<!-- Correct: Properly closed -->
<Button href="link">Text</Button>
```

#### "Preview differs from sent email"
**Causes**:
- Email client rendering differences
- CSS support variations
- Image blocking

**Solutions**:
1. Test in multiple email clients
2. Use inline styles for critical styling
3. Provide alt text for images
4. Keep layout simple

### Performance Issues

#### "Newsletter list page loads slowly"
**Symptoms**:
- > 5 seconds to load
- Timeout errors
- Browser freezing

**Solutions**:
1. Reduce page size (show 20 instead of 100)
2. Clear old drafts
3. Archive old newsletters
4. Check network connection

#### "Editor is laggy when typing"
**Symptoms**:
- Delayed character appearance
- Freezing while typing
- High CPU usage

**Solutions**:
1. Disable live preview while typing
2. Clear browser cache
3. Use simpler MDX content
4. Try different browser
5. Close other tabs/applications

### Analytics Issues

#### "Analytics not showing"
**Symptoms**:
- No data after sending
- Counts show as 0
- Missing metrics

**Timing**:
- Analytics update every 5 minutes
- Full data within 1 hour
- Historical data always available

**Solutions**:
1. Wait for processing (up to 1 hour)
2. Refresh the page
3. Check newsletter was actually sent
4. Verify recipients received emails

#### "Incorrect analytics numbers"
**Discrepancies**:
- Sent count ≠ recipient count: Some emails may fail
- High bounce rate: Check email list quality
- Low open rate: May be image blocking

### Database Issues

#### Error: "Database connection failed"
**Solutions**:
1. Check internet connection
2. Verify database credentials
3. Check if database is under maintenance
4. Contact technical support

#### Error: "Duplicate key violation"
**Meaning**: Trying to create something that exists
**Solutions**:
1. Refresh and try again
2. Use different subject line
3. Clear browser cache

### Permission Issues

#### "Access denied" or "Unauthorized"
**Requirements**:
- Must be logged in
- Must have admin role
- Session must be valid

**Solutions**:
1. Log out and log back in
2. Verify admin permissions
3. Clear cookies and retry
4. Contact administrator

## Preventive Measures

### Before Creating Newsletter
- [ ] Plan content in external editor
- [ ] Validate MDX syntax
- [ ] Prepare recipient segments
- [ ] Check recent newsletter frequency

### Before Sending
- [ ] Preview in multiple views
- [ ] Test with admin segment first
- [ ] Verify recipient count is reasonable
- [ ] Check scheduled time if applicable

### Regular Maintenance
- [ ] Clean up old drafts monthly
- [ ] Review bounce rates
- [ ] Update email lists
- [ ] Check unsubscribe trends

## Error Code Reference

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad request | Check form data |
| 401 | Unauthorized | Re-login |
| 403 | Forbidden | Check permissions |
| 404 | Not found | Check URL/ID |
| 429 | Rate limited | Wait and retry |
| 500 | Server error | Contact support |
| 503 | Service unavailable | Try later |

## Escalation Path

### Level 1: Self-Service
1. Check this troubleshooting guide
2. Try basic solutions
3. Clear cache and retry

### Level 2: Community Help
1. Check community forums
2. Ask other admins
3. Review documentation

### Level 3: Technical Support
1. Gather error details:
   - Exact error message
   - Time of occurrence
   - Steps to reproduce
   - Browser/OS info
2. Submit support ticket
3. Include screenshots if possible

## Monitoring Checklist

### Daily
- [ ] Check sending status of newsletters
- [ ] Verify scheduled newsletters
- [ ] Monitor bounce rates

### Weekly
- [ ] Review analytics
- [ ] Check unsubscribe rates
- [ ] Clean up failed sends

### Monthly
- [ ] Audit email list health
- [ ] Review segmentation effectiveness
- [ ] Update documentation

## Quick Fixes

### "Turn it off and on again"
1. Refresh the page (F5)
2. Clear browser cache (Ctrl+Shift+Del)
3. Log out and back in
4. Try incognito/private mode
5. Try different browser

### Reset Stuck Newsletter
1. Navigate to newsletter list
2. Find stuck newsletter
3. Click Edit (if available)
4. Change status to Draft
5. Save and retry sending

### Emergency Stop
If newsletter is sending incorrectly:
1. Navigate to newsletter view
2. Click "Cancel Send" (if available)
3. Contact support immediately
4. Note the newsletter ID

## Contact Support

**When to Contact Support**:
- Database errors persist
- Newsletter stuck > 2 hours
- Mass delivery failures
- Security concerns
- Data loss or corruption

**Information to Provide**:
- Newsletter ID
- Exact error message
- Time of issue
- Number of recipients affected
- Steps already tried
- Screenshots if applicable

**Response Times**:
- Critical (system down): < 1 hour
- High (blocking work): < 4 hours
- Medium (workaround exists): < 24 hours
- Low (questions): < 48 hours
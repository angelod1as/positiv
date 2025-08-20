# Email Marketing Admin Guide

## Overview

The Positiv Email Marketing System allows administrators to create, schedule, and send newsletters to community members. This guide will walk you through all the features and best practices for effective email communication.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Newsletter](#creating-your-first-newsletter)
3. [Understanding Segmentation](#understanding-segmentation)
4. [Scheduling vs Immediate Send](#scheduling-vs-immediate-send)
5. [Viewing Analytics](#viewing-analytics)
6. [Best Practices](#best-practices)

## Getting Started

### Accessing the Newsletter System

1. Log in to your admin account
2. Navigate to the Admin Dashboard
3. Click on "Newsletters" in the main menu
4. You'll see a list of all newsletters (sent, scheduled, and drafts)

### Newsletter List View

The newsletter list shows:
- **Subject**: The email subject line
- **Template**: Which template was used (Event Announcement or General News)
- **Status**: Draft, Scheduled, Sending, Sent, or Failed
- **Date**: When it was sent or scheduled
- **Recipients**: Number of recipients
- **Actions**: View, Edit (for drafts), or Delete (for drafts)

## Creating Your First Newsletter

### Step 1: Click "Create Newsletter"

From the newsletter list, click the "Create Newsletter" button to start.

### Step 2: Fill in Basic Information

#### Subject Line
- Keep it concise and engaging (50-60 characters)
- Examples:
  - "🎉 Festa de Verão - Vagas Abertas!"
  - "Novidades da Comunidade Positiv - Janeiro"
  - "Workshop de Fotografia - Inscrições Abertas"

#### Template Selection
Choose from two templates:
- **Event Announcement**: For promoting specific events
- **General News**: For community updates and general information

### Step 3: Write Your Content

The editor uses MDX, which is Markdown with components. You can write regular text and use special formatting:

#### Basic Formatting
```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*

- Bullet point 1
- Bullet point 2

1. Numbered item 1
2. Numbered item 2

[Link text](https://example.com)
```

#### Using Components
See the [MDX Component Reference](./mdx-components.md) for detailed usage.

### Step 4: Select Your Audience

Choose who should receive the newsletter:

#### All Subscribers
Sends to everyone who has opted in to marketing emails.

#### Basic Segmentation
Target specific groups:
- **Veterans Only**: Members marked as veterans
- **Newbies Only**: Members marked as newbies
- **Activity-based**: Based on event attendance

#### Advanced Segmentation
More sophisticated targeting options - see [Segmentation Guide](./segmentation-guide.md).

### Step 5: Preview Your Newsletter

Always preview before sending:
1. Click the "Preview" button
2. Review how the email will look
3. Check all links work correctly
4. Verify the unsubscribe link is present

### Step 6: Choose Send Option

#### Send Immediately
- Newsletter goes out right away
- Best for time-sensitive announcements

#### Schedule for Later
- Set a specific date and time
- Good for planning ahead
- Can be edited until the scheduled time

#### Save as Draft
- Save your work to finish later
- Can be edited and sent anytime

## Understanding Segmentation

### Why Use Segmentation?

Segmentation helps you send relevant content to the right people, improving engagement and reducing unsubscribes.

### Basic Segments

#### Veterans vs Newbies
- **Veterans**: Experienced community members
- **Newbies**: New members who might need more guidance

#### Activity-Based
- **Never Attended**: Registered but haven't attended any events
- **Has Attended**: Active participants
- **Applied but Never Attended**: Shows interest but hasn't participated yet

### Advanced Segments

#### Activity Status
- **Inactive** (>90 days): Haven't attended recently
- **Recent** (last 30 days): Currently active members
- **Lapsed** (30-90 days): Starting to disengage

#### Custom Filters
- Event attendance count (e.g., attended 5+ events)
- Date ranges for last attendance
- Specific event participation

### Viewing Recipient Count

The system shows a live count of how many people will receive your newsletter based on your segmentation. This updates as you change filters.

## Scheduling vs Immediate Send

### When to Send Immediately

- Breaking news or urgent updates
- Last-minute event announcements
- Time-sensitive information

### When to Schedule

- Regular newsletters (e.g., monthly updates)
- Event announcements with advance notice
- Content prepared ahead of time

### Best Times to Send

Based on engagement data:
- **Tuesday-Thursday**: Higher open rates
- **10 AM or 2 PM**: Peak engagement times
- **Avoid Mondays and Fridays**: Lower engagement

## Viewing Analytics

After sending, view performance metrics:

### Key Metrics

- **Sent**: Successfully delivered emails
- **Failed**: Delivery failures (usually invalid emails)
- **Bounced**: Emails that bounced back
- **Unsubscribes**: People who opted out

### Understanding the Data

- **High failure rate**: Check for invalid email addresses
- **High unsubscribe rate**: Review content relevance and frequency
- **Low open rate**: Test different subject lines and send times

## Best Practices

### Content Guidelines

1. **Keep it Concise**: Aim for 150-200 words
2. **Use Clear CTAs**: One primary call-to-action per newsletter
3. **Mobile-Friendly**: Most users read on mobile devices
4. **Personal Touch**: Write conversationally, as if to a friend

### Frequency Recommendations

- **Maximum**: 2 newsletters per week
- **Recommended**: 1 newsletter per week or bi-weekly
- **Minimum**: At least once per month to stay connected

### Subject Line Tips

✅ **DO:**
- Use emojis sparingly (1-2 max)
- Create urgency when appropriate
- Be specific about content
- Personalize when possible

❌ **DON'T:**
- Use ALL CAPS
- Include spam trigger words
- Make false promises
- Use excessive punctuation!!!

### Testing Checklist

Before sending any newsletter:
- [ ] Preview on desktop and mobile
- [ ] Test all links
- [ ] Check spelling and grammar
- [ ] Verify correct segmentation
- [ ] Confirm unsubscribe link works
- [ ] Review send time (if scheduled)

### Common Mistakes to Avoid

1. **Sending to everyone**: Use segmentation for relevance
2. **No clear CTA**: Always include a clear next step
3. **Too much content**: Keep it scannable
4. **Ignoring analytics**: Learn from each send
5. **Inconsistent schedule**: Build subscriber expectations

## Troubleshooting

### Newsletter Won't Send
- Check if you have recipients (maybe filters are too restrictive)
- Verify all required fields are filled
- Ensure MDX content is valid

### Low Recipient Count
- Review your segmentation filters
- Check if many users have unsubscribed
- Verify users have `allow_marketing_email` enabled

### Preview Not Working
- Check for MDX syntax errors
- Ensure all component props are correct
- Try simpler content to isolate the issue

## Need Help?

If you encounter issues:
1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Review the [MDX Component Reference](./mdx-components.md)
3. Contact technical support

## Quick Reference

### Keyboard Shortcuts
- `Ctrl/Cmd + B`: Bold selected text
- `Ctrl/Cmd + I`: Italic selected text
- `Ctrl/Cmd + K`: Insert link
- `Ctrl/Cmd + Enter`: Send/Schedule (when ready)

### Status Meanings
- **Draft**: Saved but not sent
- **Scheduled**: Will send at specified time
- **Sending**: Currently being processed
- **Sent**: Successfully delivered
- **Failed**: Error during sending

### Rate Limits
- Maximum 1 email per second (AWS SES limit)
- Batch processing of 50-100 emails at a time
- Large lists may take several minutes to complete
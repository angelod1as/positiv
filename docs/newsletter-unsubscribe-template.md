# Newsletter Unsubscribe URL Configuration

## Overview

This document explains how to configure the unsubscribe URL in Listmonk email templates to integrate with our custom unsubscribe page.

## Template URL Format

Add this unsubscribe link to your Listmonk email templates:

```html
<a href="https://positiv.com/newsletter/unsubscribe?id={{ .Subscriber.Attribs.profile_id }}">
  Unsubscribe from this newsletter
</a>
```

## How It Works

1. **Profile ID in Attributes**: When subscribing users via `addSubscriber()`, we store their `profile_id` in the subscriber's `attribs` field
2. **Template Variable**: Listmonk templates can access this with `{{ .Subscriber.Attribs.profile_id }}`
3. **Custom Page**: The link points to our custom unsubscribe page at `/newsletter/unsubscribe`
4. **Database Sync**: Our page calls `unsubscribeProfile()` which updates both Listmonk and our database

## Configuration Steps

### 1. Access Listmonk Admin

Navigate to: `https://your-listmonk-instance.com/admin`

### 2. Edit Campaign Template

Go to **Settings** → **Templates** → Select your campaign template

### 3. Add Unsubscribe Link

Add the unsubscribe link HTML (shown above) to your template footer.

### 4. Test the Link

Send a test email and verify:
- Link contains a valid UUID (profile_id)
- Clicking the link goes to `https://positiv.com/newsletter/unsubscribe?id={uuid}`
- The unsubscribe page loads correctly

## Important Notes

- **Do NOT use Listmonk's built-in `{{ UnsubscribeURL }}`** - This goes to Listmonk's hosted page, which doesn't sync with our database
- **Profile ID is required**: Ensure all subscribers have `profile_id` in their `attribs` field
- **Security**: Profile IDs are UUIDs with 128-bit entropy (safe for URL parameters)
- **No authentication**: The unsubscribe page works without login (industry standard)

## Fallback for Existing Subscribers

For subscribers added before this feature, who don't have `profile_id` in attribs:

1. The template variable will be empty
2. Link will be: `https://positiv.com/newsletter/unsubscribe?id=`
3. Our page will show an error
4. Solution: Re-sync subscribers to add profile_id to attribs

## Alternative: Footer Include

Instead of editing each template, you can create a footer partial:

```html
<!-- footer.html in Listmonk -->
<p style="text-align: center; font-size: 12px; color: #666;">
  <a href="https://positiv.com/newsletter/unsubscribe?id={{ .Subscriber.Attribs.profile_id }}"
     style="color: #666; text-decoration: underline;">
    Unsubscribe
  </a>
</p>
```

Then include it in all templates:

```html
{{ template "footer" . }}
```

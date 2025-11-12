# Listmonk Email Templates

This directory contains email templates for [Listmonk](https://listmonk.app), our newsletter and campaign management system.

## Template Files

## Overview

Positiv uses **HTML templates with markdown** for campaigns. This approach provides:
- Full brand control with gradient backgrounds and custom styling
- Easy content editing with markdown
- Reusable HTML snippets for rich components
- Footer with unsubscribe/view links automatically

### HTML Templates (Base Wrappers)

These templates provide the outer structure, styling, and brand wrapper:

- **`default.html`** - Main campaign template with purple gradient background
  - Includes Google Fonts (Nunito, DM Sans)
  - Full markdown support
  - Responsive design
  - Footer with unsubscribe/view links
  - Brand purple gradient (#4a75d2 to #bf03c3)

- **`transactional.html`** - Transactional email template
  - For triggered emails (confirmations, notifications)
  - Supports custom data injection via `.Tx.Data`
  - Same branding as default template

- **`archive.html`** - Public archive page template
  - Minimal footer (no unsubscribe needed)
  - For public campaign archives

- **`full.html`** - Test template showing all possible HTML/CSS
  - Reference for testing styles
  - Not meant for production use

- **`SNIPPETS.md`** - **→ Copy-paste HTML components**
  - Buttons (primary, secondary, outline)
  - Call-out boxes (info, success, warning)
  - Event cards, quote blocks, dividers
  - Two-column layouts, stat cards
  - Social media links, countdown timers
  - **Use these to build rich campaign emails!**

## Creating Campaigns

### 1. Create Campaign in Listmonk

1. Log into Listmonk admin
2. Go to **Campaigns** → **Create New**
3. Select `default` template
4. Write content using **markdown**

### 2. Use Markdown for Content

The template supports full markdown:

```markdown
# Main Heading (H1 - Purple)
## Section Heading (H2 - Blue)
### Sub-heading (H3)

**Bold text** and *italic text*

- Bullet lists
1. Numbered lists

[Links](https://www.positivparty.com)

> Blockquotes with purple accent
```

### 3. Add Rich Components

Copy HTML snippets from `SNIPPETS.md` and paste them into your campaign content:

**Example campaign:**
```markdown
# Novo Evento Disponível!

Estamos animados em anunciar nosso próximo evento!

<!-- Paste Event Card snippet here -->
<div style="background: #ffffff; border: 2px solid #bf03c3;">
  ...event card HTML...
</div>

<!-- Paste Button snippet here -->
<div style="text-align: center;">
  <a href="..." style="background: #bf03c3;">Inscrever-se</a>
</div>

Nos vemos lá! 🎉
```

## Design System Integration

All templates follow the Positiv Email Design System:

- **Primary Purple:** `#bf03c3` (headings, buttons)
- **Secondary Blue:** `#4a75d2` (links, accents)
- **Text:** `#333333` (body text)
- **Background:** `#ffffff` (email container)
- **Footer:** `#f9f9f9` (footer background)

See `/app/components/email/_design-system.md` for complete specifications.

## Template Variables

Available Listmonk variables:

### Campaign Variables
```
{{ .Campaign.Subject }}     - Campaign subject line
{{ .Campaign.FromEmail }}   - Sender email
{{ .Campaign.Name }}        - Campaign name
```

### Subscriber Variables
```
{{ .Subscriber.Email }}     - Subscriber email
{{ .Subscriber.Name }}      - Subscriber name
{{ .Subscriber.UUID }}      - Subscriber UUID
{{ .Subscriber.Attribs }}   - Custom attributes
```

### System Variables
```
{{ UnsubscribeURL }}        - Unsubscribe link (DO NOT USE - see below)
{{ MessageURL }}            - View in browser link
{{ TrackView }}             - Tracking pixel
```

### ⚠️ Important: Custom Unsubscribe URL

**DO NOT use `{{ UnsubscribeURL }}`** - Listmonk's built-in unsubscribe doesn't sync with the Positiv database.

**ALWAYS use this pattern instead:**
```html
<a href="https://www.positivparty.com/newsletter/unsubscribe?id={{ .Subscriber.Attribs.profile_id }}">
  Cancelar inscrição
</a>
```

**Why:** We need to track unsubscribes in the Positiv database (`newsletter_subscriptions` table), not just Listmonk. The custom endpoint at `/newsletter/unsubscribe` handles both systems atomically:
1. Updates Positiv database
2. Calls Listmonk API to remove subscriber
3. Syncs both systems correctly

### Transactional Data (transactional.html only)
```
{{ .Tx.Data.key }}          - Custom data passed to template
```

## How It Works

1. **Base HTML Template** (`default.html`):
   - Provides outer wrapper with purple gradient
   - Loads fonts (Nunito, DM Sans) and styles
   - Contains `{{ template "content" . }}` placeholder
   - Adds footer with unsubscribe links

2. **Campaign Content** (Markdown + HTML snippets):
   - Write in markdown for easy formatting
   - Paste HTML snippets for rich components
   - Renders inside the template wrapper

3. **Final Email**:
   ```
   ┌──────────────────────────────────┐
   │  Gradient Background (Purple)    │
   │  ┌────────────────────────────┐  │
   │  │  Logo (from template)      │  │
   │  │                            │  │
   │  │  Campaign Content:         │  │
   │  │  - Markdown text           │  │
   │  │  - HTML snippets           │  │
   │  │  - Buttons, cards, etc.    │  │
   │  │                            │  │
   │  │  Footer (from template)    │  │
   │  │  - Unsubscribe link        │  │
   │  │  - View in browser link    │  │
   │  └────────────────────────────┘  │
   └──────────────────────────────────┘
   ```

## Testing Templates

### Local Testing with Mailhog

1. Start Mailhog: `pnpm email:test`
2. Send test campaign from Listmonk
3. View email at http://localhost:8025

### Preview in Listmonk

1. Write your campaign content
2. Click **Preview** to see rendered email
3. Send test email to verify
4. Check rendering in different email clients

## Markdown Support

The `default.html` template includes full markdown support:

```markdown
**Bold text**
*Italic text*
[Links](https://example.com)
- Bullet lists
1. Numbered lists
> Blockquotes
`Inline code`
```

## Resources

- [Listmonk Documentation](https://listmonk.app/docs)
- [Templating Guide](https://listmonk.app/docs/templating/)
- [Visual Editor Guide](https://deepwiki.com/knadh/listmonk/3.5-visual-email-editor)
- [Default Visual JSON Example](https://github.com/knadh/listmonk/blob/master/static/email-templates/default-visual.json)

## Support

For questions about:
- **Template structure**: See `/app/components/email/_design-system.md`
- **Listmonk configuration**: See Listmonk docs
- **Brand guidelines**: Contact design team

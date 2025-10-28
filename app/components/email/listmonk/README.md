# Listmonk Email Templates

This directory contains email templates for [Listmonk](https://listmonk.app), our newsletter and campaign management system.

## Template Files

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

- **`full.html`** - Test template showing all possible blocks
  - Reference for available visual editor blocks
  - Not meant for production use

### Visual Template JSON

- **`emailTemplate.json`** - Visual editor template configuration
  - Defines default starter blocks for new campaigns
  - Users customize these blocks in Listmonk's visual editor
  - Maintains Positiv brand consistency

## Using the Visual Template

### 1. Import JSON into Listmonk

1. Log into Listmonk admin
2. Go to **Campaigns** → **Templates**
3. Create new template or edit existing
4. Switch to **Visual Editor** mode
5. Click **Import JSON**
6. Paste contents of `emailTemplate.json`
7. Save template

### 2. Create Campaign with Visual Editor

1. Create new campaign
2. Select your visual template
3. Edit content using drag-and-drop interface:
   - Add/remove blocks (headings, text, buttons, images)
   - Edit text inline
   - Adjust spacing
   - Change colors
   - Upload images

### 3. Blocks Included in Template

The default visual template includes:

1. **Logo Image** - Positiv logo (centered)
2. **Hero Heading (H1)** - Purple, bold, centered
3. **Intro Text** - Welcome paragraph
4. **CTA Button** - Purple button linking to site
5. **Body Text** - Additional content with markdown example
6. **Spacers** - Proper vertical spacing

### 4. Customization

Users can add these additional blocks via visual editor:

- **Headings** (H1, H2, H3)
- **Text** (supports markdown)
- **Buttons** (with links)
- **Images** (with optional links)
- **Dividers** (horizontal rules)
- **Spacers** (vertical spacing)
- **Containers** (grouped content)
- **Columns** (multi-column layouts)
- **HTML** (custom HTML blocks)

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
{{ UnsubscribeURL }}        - Unsubscribe link
{{ MessageURL }}            - View in browser link
{{ TrackView }}             - Tracking pixel
```

### Transactional Data (transactional.html only)
```
{{ .Tx.Data.key }}          - Custom data passed to template
```

## How Templates Work Together

1. **Base HTML Template** (`default.html`):
   - Provides outer wrapper with gradient
   - Loads fonts and styles
   - Contains `{{ template "content" . }}` placeholder
   - Adds footer with unsubscribe links

2. **Visual JSON** (`emailTemplate.json`):
   - Defines editable content blocks
   - Renders inside the `{{ template "content" . }}` area
   - Users edit via visual editor

3. **Final Email**:
   ```
   ┌─────────────────────────────┐
   │  Base Template Wrapper      │
   │  ┌─────────────────────┐    │
   │  │  Visual Blocks      │    │
   │  │  - Logo             │    │
   │  │  - Heading          │    │
   │  │  - Text             │    │
   │  │  - Button           │    │
   │  └─────────────────────┘    │
   │  Footer (from base)         │
   └─────────────────────────────┘
   ```

## Testing Templates

### Local Testing with Mailhog

1. Start Mailhog: `pnpm email:test`
2. Send test campaign from Listmonk
3. View email at http://localhost:8025

### Visual Editor Preview

1. Open visual editor in Listmonk
2. Make changes
3. Click **Preview** to see rendered email
4. Send test email to verify

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

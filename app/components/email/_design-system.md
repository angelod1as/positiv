# Positiv Email Design System

**Last updated:** 2025-01-26

This document defines the unified design system for all Positiv emails across Listmonk, Supabase, and React Email templates.

---

## Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Layout & Spacing](#layout--spacing)
4. [Components](#components)
5. [Theme Switching](#theme-switching)
6. [Markdown Styling](#markdown-styling)
7. [Best Practices](#best-practices)

---

## Color Palette

### Brand Colors

```css
--color-purple:     #bf03c3  /* Primary brand color */
--color-blue:       #4a75d2  /* Secondary, links */
--color-green:      #00dd87  /* Success states */
--color-lightgreen: #00ffd3  /* Accents */
--color-red:        #b7002d  /* Errors, urgent */
--color-yellow:     #ece010  /* Warnings */
```

### UI Colors

```css
--color-white:      #ffffff
--color-black:      #000000
--color-gray-100:   #f9f9f9  /* Footer background */
--color-gray-200:   #f4f4f4  /* Code blocks */
--color-gray-300:   #f0f0f0  /* Alternative background */
--color-gray-400:   #e0e0e0  /* Borders, dividers */
--color-gray-600:   #666666  /* Secondary text */
--color-gray-900:   #333333  /* Body text */
```

### Usage Guidelines

- **Primary buttons:** Purple background (#bf03c3), white text
- **Secondary buttons:** Blue background (#4a75d2), white text
- **Links:** Blue (#4a75d2), no underline, bold weight
- **Footer links:** Gray (#666), underline
- **Headings:** Purple (#bf03c3) for H1, Blue (#4a75d2) for H2, Gray (#333) for H3+
- **Body text:** Dark gray (#333)
- **Blockquote accent:** Purple left border (#bf03c3), light purple background (#f9f5ff)

---

## Typography

### Font Families

**Primary (Body):** Nunito
```css
font-family: 'Nunito', 'Helvetica Neue', Arial, sans-serif;
```

**Display (Headings):** DM Sans
```css
font-family: 'DM Sans', Arial, sans-serif;
```

**Monospace (Code):** Courier New
```css
font-family: 'Courier New', monospace;
```

### Font Sizes & Styles

| Element | Font | Size | Weight | Line Height | Margin Bottom |
|---------|------|------|--------|-------------|---------------|
| H1 | DM Sans | 32px | 800 | 1.2 | 16px |
| H2 | DM Sans | 24px | 700 | 1.3 | 12px |
| H3 | DM Sans | 20px | 700 | 1.4 | 12px |
| H4 | DM Sans | 18px | 700 | 1.4 | 12px |
| Body (p) | Nunito | 16px | 400 | 1.6 | 16px |
| Small/Footer | Nunito | 14px | 400 | 1.4 | 8px |
| Code inline | Courier | 14px | 400 | 1.5 | - |

### Typography Styles (HTML)

```html
<!-- H1 -->
<h1 style="font-family: 'DM Sans', sans-serif; font-size: 32px; font-weight: 800; color: #bf03c3; margin: 0 0 16px 0; line-height: 1.2;">
  Main Heading
</h1>

<!-- H2 -->
<h2 style="font-family: 'DM Sans', sans-serif; font-size: 24px; font-weight: 700; color: #4a75d2; margin: 24px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0;">
  Section Heading
</h2>

<!-- H3 -->
<h3 style="font-family: 'DM Sans', sans-serif; font-size: 20px; font-weight: 700; color: #333; margin: 20px 0 12px 0;">
  Subsection Heading
</h3>

<!-- H4 -->
<h4 style="font-family: 'DM Sans', sans-serif; font-size: 18px; font-weight: 700; color: #333; margin: 0 0 12px 0;">
  Small Heading
</h4>

<!-- Paragraph -->
<p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
  Body text with <strong>bold</strong> and <em>italic</em> formatting.
</p>
```

---

## Layout & Spacing

### Container Dimensions

```css
max-width: 600px;          /* Email container max width */
padding: 24px;             /* Content padding */
border-radius: 10px;       /* Container border radius */
```

### Spacing Scale

```css
--space-xs:  8px;   /* Small gaps between related items */
--space-sm:  12px;  /* Small section spacing */
--space-md:  16px;  /* Default spacing between elements */
--space-lg:  20px;  /* Large spacing between sections */
--space-xl:  24px;  /* Extra large section spacing */
--space-2xl: 30px;  /* Major section spacing */
--space-3xl: 40px;  /* Outer wrapper padding */
```

### Layout Structure

```html
<!-- Outer wrapper (Brand Purple or Clean White) -->
<div style="background: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); padding: 40px 20px; font-family: 'Nunito', 'Helvetica Neue', Arial, sans-serif;">

  <!-- Inner white container -->
  <div style="background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">

    <!-- Header -->
    <div style="text-align: center; padding: 30px 24px 20px 24px;">
      <!-- Logo -->
    </div>

    <!-- Content -->
    <div style="padding: 0 24px 30px 24px; color: #333;">
      <!-- Main content -->
    </div>

    <!-- Footer -->
    <div style="background: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
      <!-- Footer content -->
    </div>

  </div>
</div>
```

---

## Components

### Logo/Header

```html
<div style="text-align: center; padding: 30px 24px 20px 24px;">
  <img src="https://www.positivparty.com/positiv-logo-colors.png"
       alt="Positiv"
       style="max-width: 250px; height: auto;">
</div>
```

### Buttons

**Primary Button (Purple):**
```html
<div style="text-align: center; margin: 30px 0;">
  <a href="#" style="display: inline-block; background: #bf03c3; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: 'Nunito', Arial, sans-serif; box-shadow: 0 2px 8px rgba(191,3,195,0.3);">
    Button Text
  </a>
</div>
```

**Secondary Button (Blue):**
```html
<div style="text-align: center; margin: 20px 0;">
  <a href="#" style="display: inline-block; background: #4a75d2; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: 'Nunito', Arial, sans-serif;">
    Button Text
  </a>
</div>
```

### Links

**Inline Link:**
```html
<a href="#" style="color: #4a75d2; text-decoration: none; font-weight: 700;">Link Text</a>
```

**Footer Link:**
```html
<a href="#" style="color: #666; text-decoration: underline;">Link Text</a>
```

### Lists

**Unordered List:**
```html
<ul style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; padding-left: 20px; color: #333;">
  <li style="margin-bottom: 8px;">List item one</li>
  <li style="margin-bottom: 8px;">List item two</li>
  <li style="margin-bottom: 8px;">List item three</li>
</ul>
```

**Ordered List:**
```html
<ol style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; padding-left: 20px; color: #333;">
  <li style="margin-bottom: 8px;">Step one</li>
  <li style="margin-bottom: 8px;">Step two</li>
  <li style="margin-bottom: 8px;">Step three</li>
</ol>
```

### Blockquote

```html
<blockquote style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 20px 0; padding: 16px 20px; background: #f9f5ff; border-left: 4px solid #bf03c3; color: #555; font-style: italic;">
  "Quote text here"
</blockquote>
```

### Code

**Inline Code:**
```html
<code style="background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 14px; color: #bf03c3;">code</code>
```

**Code Block:**
```html
<pre style="background: #f4f4f4; padding: 16px; border-radius: 5px; overflow-x: auto; margin: 0 0 20px 0; border-left: 3px solid #bf03c3;"><code style="font-family: 'Courier New', monospace; font-size: 14px; color: #333; line-height: 1.5;">function example() {
  return true;
}</code></pre>
```

### Divider

```html
<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
```

### Footer

```html
<div style="background: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
  <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666; margin: 0 0 8px 0;">
    Você recebeu este e-mail pois se cadastrou no site da
    <a href="https://www.positivparty.com" style="color: #bf03c3; text-decoration: none;">Positiv</a>
  </p>
  <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666; margin: 0;">
    <a href="{{ UnsubscribeURL }}" style="color: #666; text-decoration: underline;">Descadastrar</a> ·
    <a href="{{ MessageURL }}" style="color: #666; text-decoration: underline;">Preferências</a>
  </p>
</div>
```

---

## Theme Switching

### Brand Purple (Default)

**Outer wrapper with gradient background:**
```html
<div style="background: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); padding: 40px 20px; font-family: 'Nunito', 'Helvetica Neue', Arial, sans-serif;">
```

### Clean White (Alternative)

**To switch to Clean White theme, replace the outer wrapper background:**
```html
<!-- THEME SWITCH: Replace outer div with this for Clean White theme -->
<div style="background: #f0f0f0; padding: 40px 20px; font-family: 'Nunito', 'Helvetica Neue', Arial, sans-serif;">
```

**Note:** Only the outer wrapper background changes. All inner content remains identical.

---

## Markdown Styling

All Listmonk templates support markdown in the visual editor and content areas. These HTML elements should be styled consistently:

### Markdown Element Mapping

| Markdown | HTML | Styling |
|----------|------|---------|
| `# Heading` | `<h1>` | 32px, purple, DM Sans |
| `## Heading` | `<h2>` | 24px, blue, DM Sans, bottom border |
| `### Heading` | `<h3>` | 20px, gray, DM Sans |
| `**bold**` | `<strong>` | Font weight 700 |
| `*italic*` | `<em>` | Font style italic |
| `[link](url)` | `<a>` | Blue, bold, no underline |
| `- item` | `<ul><li>` | 20px left padding, 8px bottom margin |
| `1. item` | `<ol><li>` | 20px left padding, 8px bottom margin |
| `` `code` `` | `<code>` | Gray bg, purple text, monospace |
| ` ```code``` ` | `<pre><code>` | Gray bg, purple left border |
| `> quote` | `<blockquote>` | Light purple bg, purple left border |

---

## Best Practices

### Email-Specific HTML/CSS Rules

1. **Always use inline styles** - Email clients ignore `<style>` tags and external CSS
2. **Use tables for layout** - Flexbox and Grid are not well-supported in email clients
3. **Avoid CSS shorthand** - Use `padding-top`, `padding-bottom` instead of `padding`
4. **Use absolute URLs** - All images and links must be fully qualified URLs
5. **Keep max-width to 600px** - Standard email width for desktop clients
6. **Test font fallbacks** - Not all email clients load web fonts
7. **Use `role="presentation"` on layout tables** - For accessibility
8. **Add alt text to all images** - For accessibility and when images don't load

### Listmonk-Specific Guidelines

1. **Use `{{ template "content" . }}`** - Placeholder for visual editor content
2. **Include `{{ TrackView }}`** - Tracking pixel (usually in footer)
3. **Use `{{ UnsubscribeURL }}`** - Required unsubscribe link
4. **Use `{{ MessageURL }}`** - View in browser link
5. **Test with Listmonk's visual editor** - Ensure blocks render correctly

### Supabase-Specific Guidelines

1. **No DOCTYPE or outer HTML** - Supabase wraps the content
2. **Self-contained fragments** - Each template is a complete HTML snippet
3. **Use Supabase variables** - `{{ .ConfirmationURL }}`, `{{ .TokenHash }}`, etc.
4. **Keep it simple** - Transactional emails should be clear and functional

### Content Guidelines

1. **Use Brazilian Portuguese** - All user-facing content
2. **Use inclusive language** - "participante", "amigues", gender-neutral terms
3. **Be direct and friendly** - Match the Positiv brand voice
4. **Front-load important info** - Put key actions/info at the top
5. **One clear CTA per email** - Don't overwhelm with multiple actions

---

## File Organization

```
app/components/email/
├── _design-system.md              # This file
├── email-design-samples.html      # Visual comparison tool
├── listmonk/
│   ├── default.html                # Campaign template
│   ├── transactional.html          # Transactional template
│   ├── archive.html                # Archive template
│   └── full.html                   # Visual editor test (all components)
├── supabase/
│   ├── confirm-signup.html
│   ├── reset-password.html
│   ├── magic-link.html
│   ├── invite-user.html
│   ├── change-email-address.html
│   └── reauthentication.html
└── react-email/
    ├── application-email.tsx       # (Future migration)
    └── reminder-email.tsx          # (Future migration)
```

---

## Version History

- **2025-01-26:** Initial design system created with Brand Purple as default theme

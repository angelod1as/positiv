# Positiv

Positiv runs events: people apply, get invited, pay and attend. The product is
split into a Public Site that Editors shape through a CMS and a Platform that
holds the event business itself.

## Language

### The two halves

**Public Site**:
The marketing and editorial part of Positiv — the homepage now, content pages
later — whose content Editors own and change without a deploy.
_Avoid_: Website, landing, marketing site

**Platform**:
The part of Positiv built around its own data — events, applications,
payments, profiles, admin. A page belongs to the Platform when its content
comes from Platform data, even if anyone can see it.
_Avoid_: App, system, backoffice

**Editor**:
A person who changes Public Site content. Not necessarily technical, and not
the same as a Platform admin.
_Avoid_: Admin, author, content manager

### Public Site content

**Page**:
A Public Site document addressed by a URL, made of an ordered list of
Sections. The **Homepage** is the Page at `/`.
_Avoid_: Landing, screen

**Section**:
A self-contained block of a Page — a hero, the about cards, the testimonials.
Each kind of Section can appear on any Page.
_Avoid_: Block, module, component, slice

**Embedded Section**:
A Section whose wording belongs to Editors but whose data comes from the
Platform. The Editor places and configures it; the Platform fills it. Next
Events is the first one.
_Avoid_: Dynamic section, widget

**Person**:
Someone the Public Site presents in their own right — today the founders,
later an author. Written once and shown wherever a Page refers to them, as a
card with what Editors wrote about them; a Person has no page of their own.
Unrelated to the Platform's participant profiles.
_Avoid_: Profile, founder (as a type), author (as a type), team member

**Testimonial**:
A quote shown inside a testimonials Section, attributed by name only. Its
author is never a Person and exists nowhere else.
_Avoid_: Review, quote

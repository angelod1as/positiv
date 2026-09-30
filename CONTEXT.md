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
A Public Site document addressed by a URL, opened by a Page Header and made of
an ordered list of Sections. Its address is unique, may be nested
(`/sobre/equipe`), and its first segment never matches a Platform route. The
**Homepage** is the Page whose address is `/`.
_Avoid_: Landing, screen

**Page Header**:
The one element that opens every Page and carries its main title. It is not a
Section: a Page has exactly one, and no Section repeats its role. It takes one
of three forms: the **Homepage Hero**, only ever on the Homepage; the **Hero**,
a lesser version for other Pages; or a plain **Title**.
_Avoid_: Hero (as the general term), title section

**Section**:
A self-contained block of a Page — the about section, the testimonials, a run
of formatted text. Each kind of Section can appear on any Page, in any order,
and most can repeat.
_Avoid_: Block, module, component, slice

**Site Settings**:
The Public Site values that belong to no single Page — the Navigation, the
footer, the Notice — edited once and shown everywhere, Platform pages included.
_Avoid_: Global config, settings (alone)

**Navigation**:
The ordered links Editors place in the header, each pointing to a Page or to
any URL. The Platform's own buttons — log in, dashboard, account — are not
part of it.
_Avoid_: Menu

**Notice**:
A short message shown across the top of every page until the visitor dismisses
it. A new Notice shows again to everyone. When the editorial system is
unreachable, a fixed Notice says so and cannot be dismissed.
_Avoid_: Banner, warning, alert

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

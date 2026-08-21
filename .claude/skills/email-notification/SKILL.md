---
name: email-notification
description: Use when adding an automated email notification fired by a database trigger. Gives the end-to-end shape to copy from the registration-limit implementation - tracking table, template, sender, internal API endpoint, and the database function that guards against duplicate sends.
---

# Recipe: automated email notification

**Automated email notification** — a database trigger that calls an internal API
endpoint, which sends the email. Follow the registration-limit implementation
end to end rather than inventing a new shape: a tracking table with a unique
constraint on the identifier, a template in `app/business/email/templates/`, a
sender in `app/business/admin/`, an endpoint under `app/pages/api/admin/` that
records the send with `onConflict().doNothing()`, and a database function that
checks the tracking table before it fires `pg_net.http_post`. Sanitize every
user-controlled field with `sanitizeHtml()`, and cover the duplicate guard and
the failure paths with integration tests.

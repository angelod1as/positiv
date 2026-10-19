import { renderTemplate } from "~/business/cms/placeholders"
import {
  type RegistrationLimitAdminCopy,
  registrationLimitAdminCopyFallback,
} from "~/business/email/registration-limit-admin-mail-copy"
import { REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES } from "~/business/email/registration-limit-admin-mail.variables"
import { registrationLimitAdminCopy } from "~/copy/emails/registration-limit-admin"
import { POSITIV_URL } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"
import { escapeHtml } from "~/lib/helpers/escape-html"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { Event } from "~types/database/entities.types"

/**
 * Registration Limit Reached Admin Email Template
 * Positiv Email Design System - Brand Purple Theme
 * Sent to admins when an event reaches 90 participants and closes automatically
 * SECURITY: All user-controlled fields are sanitized to prevent XSS attacks
 */
export const registrationLimitReachedAdminTemplate = (
  event: Event,
  participantCount: number,
  timestamp: Date,
  copy: RegistrationLimitAdminCopy = registrationLimitAdminCopyFallback,
): string => {
  const { date, time } = formatDateTime(timestamp.toISOString())
  const sanitizedEmoji = sanitizeHtml(event.emoji || "")
  const sanitizedTitle = sanitizeHtml(event.title || "")
  const eventDisplay = [sanitizedEmoji, sanitizedTitle]
    .filter(Boolean)
    .join(" ")

  const eventParticipantsUrl = `${POSITIV_URL}admin/events/${event.id}/participants`

  // The Editor owns the wording; the Platform fills the values. Both are
  // computed exactly as before the copy moved, so the email renders identically.
  const bodyValues = {
    evento: `${sanitizedEmoji ? `${sanitizedEmoji}&nbsp;` : ""}${sanitizedTitle}`,
    participantes: String(participantCount),
  }
  const heading = escapeHtml(
    renderTemplate(copy.heading, {}, REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES.heading),
  )
  const cta = escapeHtml(
    renderTemplate(copy.cta, {}, REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES.cta),
  )
  const bodyParagraphs = copy.bodyParagraphs.map((paragraph) =>
    renderTemplate(
      paragraph,
      bodyValues,
      REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES.body,
    ),
  )
  const closingParagraphs = copy.closingParagraphs.map((paragraph) =>
    renderTemplate(paragraph, {}, REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES.closing),
  )

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${registrationLimitAdminCopy.documentTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Nunito', 'Helvetica Neue', Arial, sans-serif;">

  <!-- Outer Wrapper: Brand Purple Gradient -->
  <div style="background-color: #853cca; background-image: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); padding: 40px 20px;">

    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td>
          <div style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">

            <!-- Header with Logo -->
            <div style="text-align: center; padding: 30px 24px 20px 24px; background-color: #ffffff;">
              <img src="${POSITIV_URL}positiv-logo-colors.png" alt="${registrationLimitAdminCopy.logoAlt}" width="250" style="max-width: 250px; height: auto; margin: 0 auto; display: block;">
            </div>

            <!-- Main Content Area -->
            <div style="padding: 0 24px 30px 24px; color: #333333;">

              <!-- H1 -->
              <h1 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 32px; font-weight: 800; color: #bf03c3; margin: 0 0 16px 0; line-height: 1.2; text-align: center;">
                ${heading}
              </h1>

              <!-- Intro Paragraph -->
              ${bodyParagraphs
                .map(
                  (paragraph) => `<p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                ${paragraph}
              </p>`,
                )
                .join("\n\n              ")}

              <!-- Event Details Section -->
              <div style="background-color: #f9f9f9; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">${registrationLimitAdminCopy.details.event}:</span>
                  <strong style="color: #333;">${eventDisplay}</strong>
                </div>
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">${registrationLimitAdminCopy.details.limitReachedAt}:</span>
                  <strong style="color: #333;">${registrationLimitAdminCopy.details.dateAtTime(date, time)}</strong>
                </div>
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">${registrationLimitAdminCopy.details.participantTotal}:</span>
                  <strong style="color: #333;">${participantCount}</strong>
                </div>
                <div style="font-size: 14px;">
                  <span style="color: #666;">${registrationLimitAdminCopy.details.status}:</span>
                  <strong style="color: #e85d04;">Registration Closed</strong>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${eventParticipantsUrl}" style="display: inline-block; background-color: #853cca; background-image: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(191, 3, 195, 0.3);">
                  ${cta}
                </a>
              </div>

              <!-- Info Section -->
              ${closingParagraphs
                .map(
                  (paragraph) => `<p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; color: #666; text-align: center;">
                ${paragraph}
              </p>`,
                )
                .join("\n\n              ")}

            </div>

            <!-- Footer -->
            <div style="background-color: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0 0 8px 0;">
                ${registrationLimitAdminCopy.footer.reason}
                <a href="${POSITIV_URL}" style="color: #bf03c3; text-decoration: none; font-weight: 700;">${registrationLimitAdminCopy.footer.brand}</a>
              </p>
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0;">
                <a href="${POSITIV_URL}admin" style="color: #666; text-decoration: underline;">${registrationLimitAdminCopy.footer.adminPanel}</a>
              </p>
            </div>

          </div>
        </td>
      </tr>
    </table>

  </div>

</body>
</html>`
}

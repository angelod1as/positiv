import { POSITIV_URL } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"
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
): string => {
  const { date, time } = formatDateTime(timestamp.toISOString())
  const sanitizedEmoji = sanitizeHtml(event.emoji || "")
  const sanitizedTitle = sanitizeHtml(event.title || "")
  const eventDisplay = [sanitizedEmoji, sanitizedTitle]
    .filter(Boolean)
    .join(" ")

  const eventParticipantsUrl = `${POSITIV_URL}admin/events/${event.id}/participants`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Evento atingiu limite de inscrições - Positiv</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Nunito', 'Helvetica Neue', Arial, sans-serif;">

  <!-- Outer Wrapper: Brand Purple Gradient -->
  <div style="background: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); padding: 40px 20px; min-height: 100vh;">

    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td>
          <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">

            <!-- Header with Logo -->
            <div style="text-align: center; padding: 30px 24px 20px 24px; background: #ffffff;">
              <img src="${POSITIV_URL}positiv-logo-colors.png" alt="Positiv" width="250" style="max-width: 250px; height: auto; margin: 0 auto; display: block;">
            </div>

            <!-- Main Content Area -->
            <div style="padding: 0 24px 30px 24px; color: #333333;">

              <!-- H1 -->
              <h1 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 32px; font-weight: 800; color: #bf03c3; margin: 0 0 16px 0; line-height: 1.2; text-align: center;">
                📊 Evento atingiu limite de inscrições
              </h1>

              <!-- Intro Paragraph -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                O evento <strong>${sanitizedEmoji ? `${sanitizedEmoji}&nbsp;` : ""}${sanitizedTitle}</strong> atingiu o limite de <strong>${participantCount} participantes</strong> e as inscrições foram fechadas automaticamente.
              </p>

              <!-- Event Details Section -->
              <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">Evento:</span>
                  <strong style="color: #333;">${eventDisplay}</strong>
                </div>
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">Data/hora do limite:</span>
                  <strong style="color: #333;">${date} às ${time}</strong>
                </div>
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">Total de participantes:</span>
                  <strong style="color: #333;">${participantCount}</strong>
                </div>
                <div style="font-size: 14px;">
                  <span style="color: #666;">Status:</span>
                  <strong style="color: #e85d04;">Registration Closed</strong>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${eventParticipantsUrl}" style="display: inline-block; background: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(191, 3, 195, 0.3);">
                  Ver Participantes
                </a>
              </div>

              <!-- Info Section -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; color: #666; text-align: center;">
                Esta é uma notificação automática enviada pelo sistema quando um evento atinge o limite de 90 inscrições.
              </p>

            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0 0 8px 0;">
                Notificação enviada para administradores da
                <a href="${POSITIV_URL}" style="color: #bf03c3; text-decoration: none; font-weight: 700;">Positiv</a>
              </p>
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0;">
                <a href="${POSITIV_URL}admin" style="color: #666; text-decoration: underline;">Painel Admin</a>
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

import { POSITIV_URL } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { ProfileWithRoles, ViewEvent } from "~types/database/entities.types"

/**
 * Application Email Template
 * Positiv Email Design System - Brand Purple Theme
 * Sent when a user successfully applies to an event
 * SECURITY: All user-controlled fields are sanitized to prevent XSS attacks
 */
export const applicationMailTemplate = (
  profile: NonNullable<ProfileWithRoles>,
  event: Omit<ViewEvent, "is_applied">,
): string => {
  const { date, time } = formatDateTime(event.time_event_start)
  const displayName = sanitizeHtml(profile.social_name || profile.full_name || "")
  const sanitizedEmoji = sanitizeHtml(event.emoji || "")
  const sanitizedTitle = sanitizeHtml(event.title || "")
  const eventDisplay = [sanitizedEmoji, sanitizedTitle].filter(Boolean).join(" ")

  const details = [
    ["Evento", eventDisplay],
    ["Local", sanitizeHtml(event.location || "")],
    ["Data", date],
    ["Horário de início", time],
  ]

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Inscrição em evento - Positiv</title>
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
                Sua inscrição foi recebida
              </h1>

              <!-- Intro Paragraph -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                ${displayName}, você se inscreveu com sucesso no evento <strong>${sanitizedEmoji ? `${sanitizedEmoji}&nbsp;` : ""}${sanitizedTitle}</strong>!
              </p>

              <!-- Event Details Section -->
              <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                ${details
                  .map(
                    ([label, value]) => `
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">${label}:</span>
                  <strong style="color: #333;">${value}</strong>
                </div>
                `,
                  )
                  .join("")}
              </div>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

              <!-- Important Section -->
              <h3 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #333; margin: 0 0 12px 0;">
                Importante!
              </h3>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 12px 0; color: #333;">
                Não se esqueça:
              </p>

              <ul style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; padding-left: 20px; color: #333;">
                <li style="margin-bottom: 8px;">
                  Ter participado de edições anteriores <strong>não garante</strong> a sua participação em outras festas;
                </li>
                <li style="margin-bottom: 8px;">
                  Se você quer ir acompanhade, <strong>todas as pessoas</strong> precisam se inscrever e passar pela entrevista;
                </li>
                <li style="margin-bottom: 8px;">
                  Inscrever-se no formulário <strong>não significa</strong> que você será selecionade para participar do evento;
                </li>
                <li style="margin-bottom: 8px;">
                  Temos políticas de <strong>entradas sociais</strong> para pessoas trans, negras, indígenas e em vulnerabilidade social. Se você faz parte de um desses grupos e gostaria de participar da festa, fale com Ju ou Angelo pelo nosso Whatsapp.
                </li>
              </ul>

            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0 0 8px 0;">
                Você recebeu este e-mail pois se cadastrou no site da
                <a href="${POSITIV_URL}" style="color: #bf03c3; text-decoration: none; font-weight: 700;">Positiv</a>
              </p>
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0;">
                <a href="${POSITIV_URL}conta" style="color: #666; text-decoration: underline;">Configurações</a>
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

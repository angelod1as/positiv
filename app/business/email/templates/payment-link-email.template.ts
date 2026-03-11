import { PAYMENT_PRICING } from "~/integrations/asaas/constants"
import { POSITIV_URL } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"
import { formatDateTime } from "~/lib/helpers/format-date-time"

/**
 * Payment Link Email Template
 * Positiv Email Design System - Brand Purple Theme
 * Sent to approved participants with their payment link
 * SECURITY: All user-controlled fields are sanitized to prevent XSS attacks
 */
export const paymentLinkEmailTemplate = (
  participantName: string,
  eventTitle: string,
  eventEmoji: string | null,
  paymentLink: string,
  expiresAt: Date,
): string => {
  const sanitizedName = sanitizeHtml(participantName)
  const sanitizedEmoji = sanitizeHtml(eventEmoji || "")
  const sanitizedTitle = sanitizeHtml(eventTitle || "")
  const safePaymentLink = /^https?:\/\//i.test(paymentLink) ? paymentLink : "#"
  const { date: expiryDate, time: expiryTime } = formatDateTime(expiresAt.toISOString())

  const pixAmount = PAYMENT_PRICING.pix.amount
  const creditAmount = PAYMENT_PRICING.creditCard.amount
  const maxInstallments = PAYMENT_PRICING.creditCard.maxInstallments

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Link de pagamento - Positiv</title>
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
                Link de pagamento
              </h1>

              <!-- Greeting -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                Olá, ${sanitizedName}!
              </p>

              <!-- Approval message -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                Você foi aprovade para o evento <strong>${sanitizedEmoji ? `${sanitizedEmoji}&nbsp;` : ""}${sanitizedTitle}</strong>! Segue abaixo o link para realizar o pagamento.
              </p>

              <!-- Payment Options Box -->
              <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                <div style="margin-bottom: 12px; font-size: 15px; font-weight: 700; color: #333;">
                  Opções de pagamento:
                </div>
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">Pix:</span>
                  <strong style="color: #333;">R$ ${pixAmount},00</strong>
                </div>
                <div style="font-size: 14px;">
                  <span style="color: #666;">Cartão de crédito:</span>
                  <strong style="color: #333;">R$ ${creditAmount},00</strong>
                  <span style="color: #666;">(até ${maxInstallments}x)</span>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${safePaymentLink}" style="display: inline-block; background: #bf03c3; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: 'Nunito', Arial, sans-serif; box-shadow: 0 2px 8px rgba(191,3,195,0.3);">
                  Realizar pagamento
                </a>
              </div>

              <!-- Expiry Warning -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0 0 0 0; color: #666; text-align: center;">
                Este link expira em <strong>${expiryDate} às ${expiryTime}</strong>.
              </p>

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

export const getPaymentLinkEmailSubject = (
  eventTitle: string,
  eventEmoji: string | null,
): string => {
  const display = [eventEmoji, eventTitle].filter(Boolean).join(" ")
  return `Link de pagamento - ${display}`
}

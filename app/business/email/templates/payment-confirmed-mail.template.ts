import { formatInTimeZone } from "date-fns-tz"
import { paymentConfirmedMailCopy } from "~/copy/emails/payment-confirmed"
import { paymentsCopy } from "~/copy/payments"
import { POSITIV_URL } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"
import { formatCurrency } from "~/lib/helpers/format-currency"

export type PaymentConfirmedMailInput = {
  displayName: string
  eventTitle: string
  eventEmoji: string | null
  amount: number
  method: string | null
  installmentCount: number | null
  paidAt: string
}

const methodNames: Record<string, string> = paymentsCopy.manage.methods

/**
 * Payment Confirmation Email Template
 * Positiv Email Design System - Brand Purple Theme
 * Sent when Asaas confirms the money arrived
 * SECURITY: All user-controlled fields are sanitized to prevent XSS attacks
 */
export const paymentConfirmedMailTemplate = (
  input: PaymentConfirmedMailInput,
): string => {
  const displayName = sanitizeHtml(input.displayName)
  const sanitizedEmoji = sanitizeHtml(input.eventEmoji ?? "")
  const sanitizedTitle = sanitizeHtml(input.eventTitle)
  const paidDate = formatInTimeZone(
    input.paidAt,
    "America/Sao_Paulo",
    "dd/MM/yyyy",
  )
  const methodName = input.method ? (methodNames[input.method] ?? "") : ""
  const installments =
    input.installmentCount && input.installmentCount > 1
      ? paymentConfirmedMailCopy.installments(
          input.installmentCount,
          formatCurrency(Math.ceil(input.amount / input.installmentCount)),
        )
      : ""

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${paymentConfirmedMailCopy.documentTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Nunito', 'Helvetica Neue', Arial, sans-serif;">

  <!-- Outer Wrapper: Brand Purple Gradient -->
  <div style="background: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); padding: 40px 20px;">

    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td>
          <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">

            <!-- Header with Logo -->
            <div style="text-align: center; padding: 30px 24px 20px 24px; background: #ffffff;">
              <img src="${POSITIV_URL}positiv-logo-colors.png" alt="${paymentConfirmedMailCopy.logoAlt}" width="250" style="max-width: 250px; height: auto; margin: 0 auto; display: block;">
            </div>

            <!-- Main Content Area -->
            <div style="padding: 0 24px 30px 24px; color: #333333;">

              <!-- H1 -->
              <h1 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 32px; font-weight: 800; color: #bf03c3; margin: 0 0 16px 0; line-height: 1.2; text-align: center;">
                ${paymentConfirmedMailCopy.heading}
              </h1>

              <!-- Intro Paragraph -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                ${paymentConfirmedMailCopy.intro(displayName, `${sanitizedEmoji ? `${sanitizedEmoji}&nbsp;` : ""}${sanitizedTitle}`)}
              </p>

              <!-- Receipt -->
              <h3 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #333; margin: 0 0 12px 0;">
                ${paymentConfirmedMailCopy.receiptHeading}
              </h3>

              <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                <div style="margin-bottom: 8px; font-size: 14px; color: #333;">
                  ${paymentConfirmedMailCopy.amount(formatCurrency(input.amount))}
                </div>
                ${
                  methodName
                    ? `<div style="margin-bottom: 8px; font-size: 14px; color: #333;">
                  ${paymentConfirmedMailCopy.method(methodName)}
                </div>`
                    : ""
                }
                ${
                  installments
                    ? `<div style="margin-bottom: 8px; font-size: 14px; color: #333;">
                  ${installments}
                </div>`
                    : ""
                }
                <div style="font-size: 14px; color: #333;">
                  ${paymentConfirmedMailCopy.paidAt(paidDate)}
                </div>
              </div>

              <!-- CTA -->
              <div style="text-align: center; margin: 0 0 20px 0;">
                <a href="${POSITIV_URL}dashboard" style="display: inline-block; background: #bf03c3; color: #ffffff; font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                  ${paymentConfirmedMailCopy.cta}
                </a>
              </div>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0; color: #666;">
                ${paymentConfirmedMailCopy.nextSteps}
              </p>

            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0 0 8px 0;">
                ${paymentConfirmedMailCopy.footer.reason}
                <a href="${POSITIV_URL}" style="color: #bf03c3; text-decoration: none; font-weight: 700;">${paymentConfirmedMailCopy.footer.brand}</a>
              </p>
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0;">
                <a href="${POSITIV_URL}conta" style="color: #666; text-decoration: underline;">${paymentConfirmedMailCopy.footer.settings}</a>
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

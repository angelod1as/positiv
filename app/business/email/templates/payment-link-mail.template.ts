import { formatInTimeZone } from "date-fns-tz"
import type { PaymentOption } from "~/business/payment/pricing"
import { paymentsCopy } from "~/copy/payments"
import { paymentLinkMailCopy } from "~/copy/emails/payment-link"
import { POSITIV_URL } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"

export type PaymentLinkMailInput = {
  displayName: string
  eventTitle: string
  eventEmoji: string | null
  paymentUrl: string
  dueAt: string
  options: PaymentOption[]
}

/**
 * Payment Link Email Template
 * Positiv Email Design System - Brand Purple Theme
 * Sent when an admin opens a charge for a participant
 * SECURITY: All user-controlled fields are sanitized to prevent XSS attacks
 */
export const paymentLinkMailTemplate = (input: PaymentLinkMailInput): string => {
  // The url is the one thing here that becomes an href, and sanitizeHtml only
  // guards what it wraps in markup. A scheme it does not expect is a bug
  // upstream, not something to render politely.
  if (!/^https?:\/\//i.test(input.paymentUrl)) {
    throw new Error(`Refusing to email a payment url of ${input.paymentUrl}`)
  }

  const displayName = sanitizeHtml(input.displayName)
  const sanitizedEmoji = sanitizeHtml(input.eventEmoji ?? "")
  const sanitizedTitle = sanitizeHtml(input.eventTitle)
  const dueDate = formatInTimeZone(
    input.dueAt,
    "America/Sao_Paulo",
    "dd/MM/yyyy",
  )

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${paymentLinkMailCopy.documentTitle}</title>
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
              <img src="${POSITIV_URL}positiv-logo-colors.png" alt="${paymentLinkMailCopy.logoAlt}" width="250" style="max-width: 250px; height: auto; margin: 0 auto; display: block;">
            </div>

            <!-- Main Content Area -->
            <div style="padding: 0 24px 30px 24px; color: #333333;">

              <!-- H1 -->
              <h1 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 32px; font-weight: 800; color: #bf03c3; margin: 0 0 16px 0; line-height: 1.2; text-align: center;">
                ${paymentLinkMailCopy.heading}
              </h1>

              <!-- Intro Paragraph -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                ${paymentLinkMailCopy.intro(displayName, `${sanitizedEmoji ? `${sanitizedEmoji}&nbsp;` : ""}${sanitizedTitle}`)}
              </p>

              <!-- Options -->
              <h3 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #333; margin: 0 0 12px 0;">
                ${paymentLinkMailCopy.optionsHeading}
              </h3>

              <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                ${input.options
                  .map(
                    (option) => `
                <div style="margin-bottom: 8px; font-size: 14px; color: #333;">
                  ${paymentsCopy.options.label(option)}
                </div>
                `,
                  )
                  .join("")}
              </div>

              <!-- CTA -->
              <div style="text-align: center; margin: 0 0 20px 0;">
                <a href="${input.paymentUrl}" style="display: inline-block; background: #bf03c3; color: #ffffff; font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                  ${paymentLinkMailCopy.cta}
                </a>
              </div>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0; color: #333;">
                <strong>${paymentLinkMailCopy.dueAt(dueDate)}</strong>
              </p>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0; color: #666;">
                ${paymentLinkMailCopy.afterDue}
              </p>

            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0 0 8px 0;">
                ${paymentLinkMailCopy.footer.reason}
                <a href="${POSITIV_URL}" style="color: #bf03c3; text-decoration: none; font-weight: 700;">${paymentLinkMailCopy.footer.brand}</a>
              </p>
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0;">
                <a href="${POSITIV_URL}conta" style="color: #666; text-decoration: underline;">${paymentLinkMailCopy.footer.settings}</a>
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

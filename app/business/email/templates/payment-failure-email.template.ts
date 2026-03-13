import { POSITIV_URL, POSITIV_WHATSAPP } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"

export const paymentFailureEmailTemplate = (
  participantName: string,
  eventTitle: string,
  eventEmoji: string | null,
  failureReason: string | null,
  paymentLink: string | null,
): string => {
  const sanitizedName = sanitizeHtml(participantName)
  const sanitizedEmoji = sanitizeHtml(eventEmoji || "")
  const sanitizedTitle = sanitizeHtml(eventTitle || "")
  const sanitizedReason = failureReason ? sanitizeHtml(failureReason) : null
  const safePaymentLink = paymentLink && /^https?:\/\//i.test(paymentLink)
    ? paymentLink.replace(/["'<>]/g, "")
    : null

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Problema no pagamento - Positiv</title>
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
              <h1 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 32px; font-weight: 800; color: #b7002d; margin: 0 0 16px 0; line-height: 1.2; text-align: center;">
                Problema no pagamento
              </h1>

              <!-- Greeting -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                Olá, ${sanitizedName}!
              </p>

              <!-- Warning icon -->
              <div style="text-align: center; margin: 0 0 16px 0;">
                <span style="font-size: 48px;">&#9888;</span>
              </div>

              <!-- Failure message -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0; color: #333; text-align: center;">
                Tivemos um problema ao processar seu pagamento.
              </p>
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333; text-align: center;">
                Evento: <strong>${sanitizedEmoji ? `${sanitizedEmoji}&nbsp;` : ""}${sanitizedTitle}</strong>
              </p>

              ${sanitizedReason ? `<!-- Failure Reason Box -->
              <div style="background: #fff5f5; border-left: 4px solid #b7002d; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                <div style="margin-bottom: 8px; font-size: 15px; font-weight: 700; color: #333;">
                  Motivo:
                </div>
                <div style="font-size: 14px; color: #666;">
                  ${sanitizedReason}
                </div>
              </div>` : ""}

              ${safePaymentLink ? `<!-- CTA Button -->
              <div style="text-align: center; margin: 0 0 20px 0;">
                <a href="${safePaymentLink}" style="display: inline-block; background: #b7002d; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: 'Nunito', Arial, sans-serif; box-shadow: 0 2px 8px rgba(183,0,45,0.3);">
                  Tentar novamente
                </a>
              </div>` : ""}

              <!-- Support text -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0 0 0 0; color: #666; text-align: center;">
                Se o problema persistir, entre em contato pelo nosso
                <a href="https://wa.me/${POSITIV_WHATSAPP}" style="color: #bf03c3; text-decoration: none; font-weight: 700;">WhatsApp</a>.
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

export const getPaymentFailureEmailSubject = (
  eventTitle: string,
  eventEmoji: string | null,
): string => {
  const display = [eventEmoji, eventTitle].filter(Boolean).join(" ")
  return `Problema no pagamento - ${display}`
}

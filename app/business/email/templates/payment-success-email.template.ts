import { POSITIV_URL } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"

export const paymentSuccessEmailTemplate = (
  participantName: string,
  eventTitle: string,
  eventEmoji: string | null,
  paymentMethod: string,
  amount: string,
  installments: number | null,
  paymentDate: string,
): string => {
  const sanitizedName = sanitizeHtml(participantName)
  const sanitizedEmoji = sanitizeHtml(eventEmoji || "")
  const sanitizedTitle = sanitizeHtml(eventTitle || "")
  const sanitizedPaymentMethod = sanitizeHtml(paymentMethod)
  const sanitizedAmount = sanitizeHtml(amount)
  const sanitizedPaymentDate = sanitizeHtml(paymentDate)

  const installmentsRow = installments && installments > 1
    ? `<div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">Parcelas:</span>
                  <strong style="color: #333;">${installments}x</strong>
                </div>`
    : ""

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Pagamento confirmado - Positiv</title>
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
                Pagamento confirmado
              </h1>

              <!-- Greeting -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                Olá, ${sanitizedName}!
              </p>

              <!-- Success message with checkmark -->
              <div style="text-align: center; margin: 0 0 16px 0;">
                <span style="font-size: 48px;">&#10003;</span>
              </div>

              <!-- Confirmation text -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0; color: #333; text-align: center;">
                Seu pagamento foi confirmado com sucesso!
              </p>
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333; text-align: center;">
                Evento: <strong>${sanitizedEmoji ? `${sanitizedEmoji}&nbsp;` : ""}${sanitizedTitle}</strong>
              </p>

              <!-- Payment Details Box -->
              <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                <div style="margin-bottom: 12px; font-size: 15px; font-weight: 700; color: #333;">
                  Detalhes do pagamento:
                </div>
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">Método:</span>
                  <strong style="color: #333;">${sanitizedPaymentMethod}</strong>
                </div>
                <div style="margin-bottom: 8px; font-size: 14px;">
                  <span style="color: #666;">Valor:</span>
                  <strong style="color: #333;">${sanitizedAmount}</strong>
                </div>
                ${installmentsRow}
                <div style="font-size: 14px;">
                  <span style="color: #666;">Data:</span>
                  <strong style="color: #333;">${sanitizedPaymentDate}</strong>
                </div>
              </div>

              <!-- Next steps -->
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 0 0; color: #333; text-align: center;">
                Agora é só aguardar o dia do evento!
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

export const getPaymentSuccessEmailSubject = (
  eventTitle: string,
  eventEmoji: string | null,
): string => {
  const display = [eventEmoji, eventTitle].filter(Boolean).join(" ")
  return `Pagamento confirmado - ${display}`
}

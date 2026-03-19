import { POSITIV_URL } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"

type PaymentRefundMailParams = {
  participantName: string
  eventName: string
  refundAmount: number
}

function formatCurrency(reais: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(reais)
}

export function paymentRefundMailTemplate({
  participantName,
  eventName,
  refundAmount,
}: PaymentRefundMailParams): string {
  const safeName = sanitizeHtml(participantName)
  const safeEventName = sanitizeHtml(eventName)
  const formattedAmount = formatCurrency(refundAmount)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reembolso Processado - Positiv</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Nunito', 'Helvetica Neue', Arial, sans-serif;">

  <div style="background: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); padding: 40px 20px; min-height: 100vh;">

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td>
          <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">

            <div style="text-align: center; padding: 30px 24px 20px 24px; background: #ffffff;">
              <img src="${POSITIV_URL}positiv-logo-colors.png" alt="Positiv" width="250" style="max-width: 250px; height: auto; margin: 0 auto; display: block;">
            </div>

            <div style="padding: 0 24px 30px 24px; color: #333333;">

              <h1 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 28px; font-weight: 800; color: #bf03c3; margin: 0 0 16px 0; line-height: 1.2; text-align: center;">
                Reembolso Processado
              </h1>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                Olá, <strong>${safeName}</strong>! O reembolso do seu pagamento para o evento <strong>${safeEventName}</strong> foi processado.
              </p>

              <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 0 0 20px 0; text-align: center;">
                <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666; margin: 0 0 4px 0;">
                  Valor reembolsado
                </p>
                <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 24px; font-weight: 800; color: #4a75d2; margin: 0;">
                  ${formattedAmount}
                </p>
              </div>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #666;">
                O prazo para o valor aparecer na sua conta depende do método de pagamento utilizado. Em caso de dúvidas, entre em contato conosco.
              </p>

            </div>

            <div style="background: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0 0 8px 0;">
                E-mail enviado pela
                <a href="${POSITIV_URL}" style="color: #bf03c3; text-decoration: none; font-weight: 700;">Positiv</a>
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

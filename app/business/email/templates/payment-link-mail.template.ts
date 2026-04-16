import { POSITIV_URL } from "~/lib/constants/constants"
import { formatCurrency } from "~/lib/helpers/chart-utils"
import { sanitizeHtml } from "~/lib/email/sanitize-html"
import type { PaymentOption } from "~/business/email/payment-email.types"

type PaymentLinkMailParams = {
  participantName: string
  eventName: string
  paymentOptions: PaymentOption[]
  paymentUrl: string
  expiresAt: Date
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date)
}

function buildPricingRows(options: PaymentOption[]): string {
  return options
    .map((o) => {
      const label =
        o.billingType === "PIX"
          ? "Pix (à vista)"
          : o.installments === 1
            ? "Cartão 1x"
            : `Cartão ${o.installments}x`

      const value =
        o.billingType === "PIX" || o.installments === 1
          ? formatCurrency(o.totalReais)
          : `${o.installments}x de ${formatCurrency(o.perInstallmentReais)} (${formatCurrency(o.totalReais)})`

      return `<tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; color: #333;">${label}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; color: #333; text-align: right; font-weight: 600;">${value}</td>
      </tr>`
    })
    .join("")
}

export function paymentLinkMailTemplate({
  participantName,
  eventName,
  paymentOptions,
  paymentUrl,
  expiresAt,
}: PaymentLinkMailParams): string {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(paymentUrl)
  } catch {
    throw new Error(`Invalid payment URL: ${paymentUrl}`)
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error(`Invalid payment URL protocol: ${parsedUrl.protocol}`)
  }
  const safePaymentUrl = parsedUrl.href

  const safeName = sanitizeHtml(participantName)
  const safeEventName = sanitizeHtml(eventName)
  const formattedExpiry = formatDate(expiresAt)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Link de Pagamento - Positiv</title>
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
                Link de Pagamento
              </h1>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                Olá, <strong>${safeName}</strong>! Seu pagamento para o evento <strong>${safeEventName}</strong> está disponível.
              </p>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #333;">
                Confira as opções de pagamento:
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; margin: 0 0 24px 0;">
                <thead>
                  <tr style="background: #f9f9f9;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #666; font-weight: 600;">Forma</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #666; font-weight: 600;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildPricingRows(paymentOptions)}
                </tbody>
              </table>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${safePaymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(191, 3, 195, 0.3);">
                  Realizar Pagamento
                </a>
              </div>

              <div style="background: #fff3cd; border-radius: 8px; padding: 12px 16px; margin: 0 0 20px 0;">
                <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.5; margin: 0; color: #856404;">
                  ⚠️ Este link expira em <strong>${formattedExpiry}</strong>. Após essa data, será necessário solicitar um novo link.
                </p>
              </div>

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

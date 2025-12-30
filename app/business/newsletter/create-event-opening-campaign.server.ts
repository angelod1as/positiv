import { composable } from "composable-functions"
import {
  DASHBOARD_URL,
  LISTMONK_EVENT_OPENING_TEMPLATE_ID,
} from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { ViewEvent } from "~types/database/entities.types"
import { getListmonkConfig } from "./listmonk-client.server"

interface CreateCampaignParams {
  event: Omit<ViewEvent, "is_applied">
  listIds: number[]
  sendImmediately?: boolean
}

interface CampaignResponse {
  data: {
    id: number
    name: string
    subject: string
    status: string
  }
}

function generateCampaignBody(event: Omit<ViewEvent, "is_applied">): string {
  const { date, time } = formatDateTime(event.time_event_start)
  const { date: applicationOpenDate, time: applicationOpenTime } =
    formatDateTime(event.time_application_start)
  const { date: applicationCloseDate, time: applicationCloseTime } =
    formatDateTime(event.time_application_end)

  const sanitizedEmoji = sanitizeHtml(event.emoji || "")
  const sanitizedTitle = sanitizeHtml(event.title || "")
  const sanitizedLocation = sanitizeHtml(event.location || "")

  const eventDisplay = [
    sanitizedEmoji
      ? `<span style="display: inline-block; line-height: 1;">${sanitizedEmoji}</span>`
      : "",
    sanitizedTitle,
  ]
    .filter(Boolean)
    .join("&nbsp;")

  return `
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 32px; font-weight: 800; color: #bf03c3; margin: 0 0 16px 0; line-height: 1.2;">
    <span style="display: inline-block; line-height: 1;">🎉</span> Inscrições Abertas <span style="display: inline-block; line-height: 1;">🎉</span>
  </h1>
</div>

<p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
  As inscrições para o evento <strong>${eventDisplay}</strong> acabaram de abrir!
</p>

<p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
  Corra já e garanta a sua vaga!
</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="${DASHBOARD_URL}" style="display: inline-block; background: #bf03c3; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: 'Nunito', Arial, sans-serif; box-shadow: 0 2px 8px rgba(191,3,195,0.3);">
    Inscreva-se agora!
  </a>
</div>

<div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
  <div style="margin-bottom: 8px; font-size: 14px;">
    <span style="color: #666;">Evento:</span>
    <strong style="color: #333;">${sanitizedTitle}</strong>
  </div>
  <div style="margin-bottom: 8px; font-size: 14px;">
    <span style="color: #666;">Local:</span>
    <strong style="color: #333;">${sanitizedLocation}</strong>
  </div>
  <div style="margin-bottom: 8px; font-size: 14px;">
    <span style="color: #666;">Data do evento:</span>
    <strong style="color: #333;">${date}</strong>
  </div>
  <div style="margin-bottom: 8px; font-size: 14px;">
    <span style="color: #666;">Horário de início:</span>
    <strong style="color: #333;">${time}</strong>
  </div>
  <div style="margin-bottom: 8px; font-size: 14px;">
    <span style="color: #666;">Inscrições abrem em:</span>
    <strong style="color: #333;">${applicationOpenDate} às ${applicationOpenTime}</strong>
  </div>
  <div style="margin-bottom: 8px; font-size: 14px;">
    <span style="color: #666;">Inscrições fecham em:</span>
    <strong style="color: #333;">${applicationCloseDate} às ${applicationCloseTime}</strong>
  </div>
</div>

<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

<h3 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #333; margin: 0 0 12px 0;">
  Informações importantes
</h3>

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
    Temos políticas de <strong>entradas sociais</strong> para pessoas trans, negras, indígenas e em vulnerabilidade social. Se você é de um desses grupos e gostaria de participar da festa, fale com Ju ou Angelo pelo nosso WhatsApp.
  </li>
</ul>
`.trim()
}

export const createEventOpeningCampaign = composable(
  async (params: CreateCampaignParams): Promise<CampaignResponse> => {
    const { event, listIds, sendImmediately = false } = params

    const { listmonkApiUrl, headers } = getListmonkConfig()

    const sanitizedTitle = sanitizeHtml(event.title || "")
    const campaignName = `Event Opening: ${sanitizedTitle}`
    const subject = `Inscrições abertas: ${sanitizedTitle}!`

    const body = generateCampaignBody(event)

    const campaignData = {
      name: campaignName,
      subject,
      lists: listIds,
      type: "regular",
      content_type: "html",
      template_id: LISTMONK_EVENT_OPENING_TEMPLATE_ID,
      body,
    }

    const response = await fetch(`${listmonkApiUrl}/api/campaigns`, {
      method: "POST",
      headers,
      body: JSON.stringify(campaignData),
    })

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read error body")
      throw new Error(
        `Failed to create campaign: ${response.status} ${response.statusText}. Response: ${errorBody}`,
      )
    }

    const result = (await response.json()) as CampaignResponse

    if (sendImmediately) {
      await fetch(`${listmonkApiUrl}/api/campaigns/${result.data.id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "running" }),
      })

      if (!response.ok) {
        console.error(`Failed to start campaign ${result.data.id}`)
      }
    }

    return result
  },
)

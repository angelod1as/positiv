import type { Database } from "../../app/types/database/database.types"
import type { AsaasWebhookResponse } from "../../app/routes/api.asaas-webhook"
import { createSupabaseAdminClient } from "./db-cleanup"

type PaymentRequestStatus =
  Database["public"]["Enums"]["payment_request_status"]

const APP_BASE_URL = "http://localhost:5173"

export async function getPaymentRequestByEventParticipantId(
  eventParticipantId: string,
) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("payment_requests")
    .select("*")
    .eq("event_participant_id", eventParticipantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

export async function getEventParticipantId(
  profileId: string,
  eventId: string,
) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("event_participants")
    .select("id")
    .eq("profile_id", profileId)
    .eq("event_id", eventId)
    .single()

  if (error) throw new Error(`Event participant not found: ${error.message}`)
  return data.id
}

export async function seedPaymentRequest(params: {
  eventParticipantId: string
  amount: number
  status?: PaymentRequestStatus
  paymentMode?: string
  asaasPaymentId?: string | null
}) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      event_participant_id: params.eventParticipantId,
      amount: params.amount,
      status: params.status ?? "pending",
      payment_mode: params.paymentMode ?? "automatic",
      asaas_payment_id: params.asaasPaymentId ?? null,
      expires_at: new Date(
        Date.now() + 2 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select()
    .single()

  if (error)
    throw new Error(`Failed to seed payment request: ${error.message}`)
  return data
}

export async function updatePaymentRequest(
  paymentRequestId: string,
  fields: Record<string, unknown>,
) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("payment_requests")
    .update(fields)
    .eq("id", paymentRequestId)

  if (error)
    throw new Error(`Failed to update payment request: ${error.message}`)
}

export async function deletePaymentRequestsByParticipant(
  eventParticipantId: string,
) {
  const supabase = createSupabaseAdminClient()
  await supabase
    .from("payment_requests")
    .delete()
    .eq("event_participant_id", eventParticipantId)
}

export async function postWebhook(payload: {
  event: string
  payment: { id: string; value?: number }
}): Promise<{ status: number; body: AsaasWebhookResponse }> {
  const response = await fetch(`${APP_BASE_URL}/api/asaas-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return {
    status: response.status,
    body: (await response.json()) as AsaasWebhookResponse,
  }
}

export async function createTestEvent(params: {
  title: string
  ticketPrice: number
}) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: params.title,
      ticket_price: params.ticketPrice,
      event_status: "Registration Open",
      time_event_start: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_event_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      total_spots: 50,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test event: ${error.message}`)
  return data
}

export async function cleanupTestPaymentEvent(eventId: string) {
  const supabase = createSupabaseAdminClient()

  const { data: participants } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)

  if (participants) {
    for (const p of participants) {
      await supabase
        .from("payment_requests")
        .delete()
        .eq("event_participant_id", p.id)
    }
  }

  await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)

  await supabase.from("events").delete().eq("id", eventId)
}

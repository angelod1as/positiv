import { randomUUID } from 'node:crypto'
import { E2E_ASAAS_API_KEY, E2E_ASAAS_WEBHOOK_TOKEN } from '../mocks/asaas-mock-server'
import { createSupabaseAdminClient } from './db-cleanup'
import { getAsaasMockUrl, getBaseUrl } from './run-context'

type WebhookCharge = {
  id: string
  value: number
  netValue: number
  installment?: string
  externalReference?: string
  refunds?: { value: number; status: string }[]
}

export type MockCall = { method: string; path: string; body: Record<string, unknown> | undefined }

export type MockCharge = {
  id: string
  value: number
  status: string
  installment: string | null
  externalReference: string | null
}

// payment_webhook_events dedupes on the event id and is never cleaned, so an
// id reused across runs would be dropped as a redelivery.
export function buildWebhookEvent(event: string, payment: WebhookCharge) {
  return {
    id: `evt_${randomUUID()}`,
    event,
    dateCreated: new Date().toISOString().slice(0, 19).replace('T', ' '),
    payment,
  }
}

export function postWebhook(body: ReturnType<typeof buildWebhookEvent>): Promise<Response> {
  return fetch(`${getBaseUrl()}/api/asaas/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': E2E_ASAAS_WEBHOOK_TOKEN,
    },
    body: JSON.stringify(body),
  })
}

export async function resetAsaasMock(): Promise<void> {
  await fetch(`${getAsaasMockUrl()}/__mock/reset`, { method: 'POST' })
}

export async function getAsaasMockCalls(): Promise<MockCall[]> {
  return (await fetch(`${getAsaasMockUrl()}/__mock/calls`)).json()
}

function asaasMockApi(path: string, method = 'GET'): Promise<Response> {
  return fetch(`${getAsaasMockUrl()}/v3${path}`, {
    method,
    headers: { access_token: E2E_ASAAS_API_KEY },
  })
}

export async function getMockPlanCharges(installmentId: string): Promise<MockCharge[]> {
  const response = await asaasMockApi(`/payments?installment=${installmentId}&limit=100`)
  return ((await response.json()) as { data: MockCharge[] }).data
}

// Stands in for the participant paying on the Asaas invoice page.
export async function confirmMockCharge(chargeId: string): Promise<void> {
  const response = await asaasMockApi(`/sandbox/payment/${chargeId}/confirm`, 'POST')
  if (!response.ok) throw new Error(`The mock refused to confirm ${chargeId}: ${response.status}`)
}

export async function getParticipantPayments(profileId: string, eventId: string) {
  const supabase = createSupabaseAdminClient()

  const { data: participant, error: participantError } = await supabase
    .from('event_participants')
    .select('id')
    .eq('profile_id', profileId)
    .eq('event_id', eventId)
    .single()

  if (participantError || !participant) {
    throw new Error(`No participant for profile ${profileId}: ${participantError?.message}`)
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('event_participant_id', participant.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to read payments: ${error.message}`)

  return data
}

// Enrols an existing account on an event as a regular spot, the only kind a
// charge can be sent to.
export async function enrolRegularParticipant(userId: string, eventId: string) {
  const supabase = createSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, social_name, full_name')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error(`No profile for user ${userId}: ${profileError?.message}`)
  }

  const { error } = await supabase.from('event_participants').insert({
    profile_id: profile.id,
    event_id: eventId,
    is_user_applied: true,
    application_status: 'talking',
    attendance_status: 'pending',
    spot_type: 'regular',
  })

  if (error) throw new Error(`Failed to enrol ${profile.id}: ${error.message}`)

  return { profileId: profile.id, name: profile.social_name || profile.full_name || '' }
}

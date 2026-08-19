import type { Page } from '@playwright/test'
import { createSupabaseAdminClient } from './db-cleanup'
import { runEventTitle } from './run-context'

export const DIRECT_APPLY_LABEL = 'Candidatura direta (admin)'

/**
 * The dashboard lists the twelve events starting soonest, so an event created
 * far out never reaches the page. This one starts in two days, ahead of what
 * the other suites create, and carries the run's own prefix so teardown claims
 * it.
 */
export async function createSoonOpenEvent(label: string): Promise<{ id: string; title: string }> {
  const supabase = createSupabaseAdminClient()

  const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: runEventTitle(label),
      event_status: 'Registration Open',
      event_type: 'regular',
      time_event_start: start.toISOString(),
      time_event_end: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      description: 'Test event for the direct admin application',
      location: 'Test Location',
      total_spots: 100,
    })
    .select('id, title')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create the direct application test event: ${error?.message}`)
  }

  return { id: data.id, title: data.title || '' }
}

export async function openParticipantDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  // A freshly created account lands on the terms before it ever sees an event.
  if (page.url().includes('/conta/termos-e-condicoes')) {
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /aceitar/i }).click()
    await page.waitForURL('/dashboard')
    await page.waitForLoadState('networkidle')
  }
}

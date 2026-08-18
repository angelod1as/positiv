import type { Page } from '@playwright/test'

export const DIRECT_APPLY_LABEL = 'Candidatura direta (admin)'

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

import { test, expect } from '@playwright/test'
import path from 'path'
import { AdminSettingsPage } from '../../pages/admin/AdminSettingsPage'
import { setLikertSettings } from '../../utils/likert-helpers'

test.describe('Admin Access Control', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  test('admin has full access to all areas', async ({ page }) => {
    // Test 1: Dashboard access (allowed - may redirect to terms first)
    await page.goto('/dashboard')
    const currentUrl = page.url()
    
    // Accept either dashboard or terms page
    expect(currentUrl.includes('/dashboard') || currentUrl.includes('/conta/termos-e-condicoes')).toBe(true)
    
    // If on terms page, accept and proceed
    if (currentUrl.includes('/conta/termos-e-condicoes')) {
      const acceptButton = page.getByRole('button', { name: /aceitar/i })
      if (await acceptButton.isVisible()) {
        await acceptButton.click()
        await page.waitForURL('/dashboard')
      }
    }
    
    // Test 2: Admin panel access (allowed)
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    
    // Verify admin panel content
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()

    // Check for open events cards section
    const openEventsHeading = page.getByRole('heading', { name: 'Eventos com candidaturas abertas', exact: true })
    const openEventsCards = page.getByTestId('admin-event-card')
    const openEventsCount = await openEventsCards.count()

    if (openEventsCount > 0) {
      // If there are open events, verify the section appears
      await expect(openEventsHeading).toBeVisible()
      // Should have between 1 and 3 cards
      expect(openEventsCount).toBeGreaterThanOrEqual(1)
      expect(openEventsCount).toBeLessThanOrEqual(3)
    }

    // Check for events table section (always present) - AG Grid uses "Todos os eventos" header
    await expect(page.getByRole('heading', { name: 'Todos os eventos', exact: true })).toBeVisible()
    await expect(page.locator('[data-testid="ag-data-table-admin-events"]')).toBeVisible()
    
    // Test 3: Account page access (allowed)
    await page.goto('/conta')
    await expect(page).toHaveURL('/conta')
  })

  test('admin can navigate between admin and regular areas', async ({ page }) => {
    // Start at admin panel
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    
    // Verify admin content is loaded
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
    
    // Navigate to regular dashboard
    await page.goto('/dashboard')
    const dashboardUrl = page.url()
    
    // Admin might also be redirected to terms - verify navigation works
    if (dashboardUrl.includes('/conta/termos-e-condicoes')) {
      // On terms page, verify content
      await expect(page.getByText('O que é a Positiv?')).toBeVisible()
    } else {
      // On dashboard, verify content
      await expect(page).toHaveURL('/dashboard') 
      const heading = page.getByRole('heading', { name: 'Eventos da Positiv', exact: true })
      await expect(heading).toBeVisible()
    }
    
    // Navigate back to admin area
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
  })

  test('admin sees the Likert scale whatever the switches say, and turns them in Configurações', async ({ page }) => {
    const settings = new AdminSettingsPage(page)
    const likertLink = () => page.getByRole('link', { name: 'Escala de Likert' })

    try {
      await setLikertSettings({ enabled: false, required: false })

      // Both off: the scale still opens for the team
      await page.goto('/conta/escala/responder')
      await expect(page).toHaveURL('/conta/escala/responder')
      await expect(page.getByRole('progressbar')).toBeVisible()

      await settings.navigate()
      await expect(settings.likertAccessSwitch()).not.toBeChecked()
      await expect(settings.likertRequiredSwitch()).not.toBeChecked()

      await settings.setLikertSwitch('access', true)
      await settings.setLikertSwitch('required', true)
      await settings.navigate()
      await expect(settings.likertAccessSwitch()).toBeChecked()
      await expect(settings.likertRequiredSwitch()).toBeChecked()

      // "Obrigatória" puts the way in on the account page
      await page.goto('/conta')
      await expect(likertLink()).toBeVisible()

      await settings.navigate()
      await settings.setLikertSwitch('access', false)
      await settings.setLikertSwitch('required', false)
      await settings.navigate()
      await expect(settings.likertAccessSwitch()).not.toBeChecked()
      await expect(settings.likertRequiredSwitch()).not.toBeChecked()

      await page.goto('/conta')
      await expect(page.getByRole('link', { name: 'Mudar senha' })).toBeVisible()
      await expect(likertLink()).toHaveCount(0)
    } finally {
      await setLikertSettings({ enabled: false, required: false })
    }
  })
})

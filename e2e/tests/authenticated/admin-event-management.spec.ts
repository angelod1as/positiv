import { test, expect } from '@playwright/test'
import path from 'path'
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage'
import { EventManagementPage } from '../../pages/admin/EventManagementPage'
import { adminInvitesCopy } from '../../../app/copy/admin/invites'
import { runEventTitle } from '../../utils/run-context'
import { readSetupUser } from '../../utils/setup-user'
import { createEventAsAdmin, setEventStatusAsAdmin } from '../../utils/admin-event-helpers'

test.describe('Admin Event Management', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  // Note: Test events are cleaned up in global teardown to avoid
  // interfering with other tests that may need them

  test('admin creates an event from the dashboard', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page)
    const eventManagement = new EventManagementPage(page)
    const eventTitle = runEventTitle(`Event ${Date.now()}`)

    await adminDashboard.navigate()
    await expect(page).toHaveURL('/admin')
    await adminDashboard.verifyAdminAccess()
    await expect(adminDashboard.eventsTable).toBeVisible({ timeout: 10000 })

    await adminDashboard.clickCreateEvent()
    await expect(page).toHaveURL('/admin/eventos/novo')

    await eventManagement.fillBasicEventInfo({
      title: eventTitle,
      emoji: '🎉',
      location: 'Test Location',
      price: '100',
      capacity: '50'
    })
    const eventDate = new Date()
    eventDate.setMonth(eventDate.getMonth() + 2)
    await eventManagement.setEventStartDate(eventDate)
    await eventManagement.clickCalculateDates()
    await eventManagement.saveEvent()

    await expect(page).toHaveURL(/\/admin\/eventos\/[\w-]+$/)
    await expect(eventManagement.eventHeading).toContainText(eventTitle)
  })

  test('calculating the dates fills every date field', async ({ page }) => {
    const eventManagement = new EventManagementPage(page)

    await page.goto('/admin/eventos/novo')

    const eventDate = new Date()
    eventDate.setMonth(eventDate.getMonth() + 2)
    await eventManagement.setEventStartDate(eventDate)
    await eventManagement.clickCalculateDates()

    const allDatesFilled = await eventManagement.verifyAllDatesAreFilled()
    expect(allDatesFilled).toBeTruthy()
  })

  test('an event opens from the dashboard', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page)
    const eventManagement = new EventManagementPage(page)
    const event = await createEventAsAdmin(`Listed ${Date.now()}`)

    await adminDashboard.navigate()
    await adminDashboard.eventsTable.waitFor({ state: 'visible' })
    await adminDashboard.waitForEventInList(event.title)
    await adminDashboard.clickViewEvent(event.title)

    await expect(page).toHaveURL(`/admin/eventos/${event.id}`)
    await expect(eventManagement.eventHeading).toContainText(event.title)
  })

  // The sheet is produced on the event page itself, rather than on a page of
  // its own
  test('the event page downloads the participants sheet', async ({ page }) => {
    const eventManagement = new EventManagementPage(page)
    const event = await createEventAsAdmin(`Sheet ${Date.now()}`)

    await page.goto(`/admin/eventos/${event.id}`)
    await expect(eventManagement.eventHeading).toContainText(event.title)

    const downloadPromise = page.waitForEvent('download')
    await eventManagement.clickDownloadData()
    expect((await downloadPromise).suggestedFilename()).toBe('planilha.csv')
  })

  test('admin edits an event title and price', async ({ page }) => {
    const eventManagement = new EventManagementPage(page)
    const event = await createEventAsAdmin(`Edit ${Date.now()}`)
    const updatedEventTitle = runEventTitle(`Updated Event ${Date.now()}`)

    await page.goto(`/admin/eventos/${event.id}`)
    await eventManagement.clickEdit()
    await expect(page).toHaveURL(/\/admin\/eventos\/novo\/[\w-]+$/)

    await eventManagement.updateTitle(updatedEventTitle)
    await eventManagement.updatePrice('150')
    await eventManagement.saveEvent()

    await expect(page).toHaveURL(/\/admin\/eventos\/[\w-]+$/)
    await expect(eventManagement.eventHeading).toContainText(updatedEventTitle)
  })

  test('an event moves through scheduled, open and closed', async ({ page }) => {
    const eventManagement = new EventManagementPage(page)
    const event = await createEventAsAdmin(`Status ${Date.now()}`)

    await page.goto(`/admin/eventos/${event.id}`)

    await eventManagement.changeStatus('Scheduled')
    await eventManagement.changeStatus('Registration Open')
    await eventManagement.changeStatus('Registration Closed')
  })

  // A closed event's page is where an invite is generated. Searched by e-mail:
  // it is the one thing about the setup user no other suite can be using at
  // the same time.
  test('admin generates an invite and revokes it', async ({ page }) => {
    const event = await createEventAsAdmin(`Invite ${Date.now()}`)
    await setEventStatusAsAdmin(event.id, 'Registration Closed')
    const { modal } = adminInvitesCopy
    const invitee = await readSetupUser()

    await page.goto(`/admin/eventos/${event.id}`)

    await page.getByRole('button', { name: adminInvitesCopy.trigger }).click()
    await page.getByLabel(modal.searchLabel).fill(invitee.email)

    const inviteButton = page.getByRole('button', { name: modal.invite, exact: true })
    await expect(inviteButton).toBeEnabled({ timeout: 15000 })
    await inviteButton.click()

    await expect(page.getByTestId('invite-link')).toHaveValue(/\/convite\/.+/, {
      timeout: 15000,
    })
    // Scoped to the invite row: "Convite gerado" on the search button below
    // also contains the word, and a bare getByText matches both.
    await expect(page.getByTestId('invite-status')).toContainText(
      modal.status.created,
    )

    // And calling it off is what keeps a link that went to the wrong person
    // from staying valid.
    await page.getByRole('button', { name: modal.revoke }).click()
    await expect(page.getByTestId('invite-status')).toContainText(
      modal.status.revoked,
      { timeout: 15000 },
    )
  })

  test('a closed event is marked completed', async ({ page }) => {
    const eventManagement = new EventManagementPage(page)
    const event = await createEventAsAdmin(`Completed ${Date.now()}`)
    await setEventStatusAsAdmin(event.id, 'Registration Closed')

    await page.goto(`/admin/eventos/${event.id}`)

    await eventManagement.changeStatus('Completed')

    const finalStatus = await eventManagement.getCurrentStatus()
    expect(finalStatus).toBe('Completed')
  })

  test('a half-written event survives a reload', async ({ page }) => {
    const eventManagement = new EventManagementPage(page)
    const draftTitle = runEventTitle(`Draft ${Date.now()}`)

    await page.goto('/admin/eventos/novo')

    await eventManagement.titleInput.fill(draftTitle)
    await eventManagement.locationInput.fill('Motel Harmony')

    // The draft is written as it is typed. Reloading is the whole point: an
    // admin who closes the tab half way through used to start again.
    await expect(eventManagement.titleInput).toHaveValue(draftTitle)
    await page.reload()

    await expect(eventManagement.titleInput).toHaveValue(draftTitle)
    await expect(eventManagement.locationInput).toHaveValue('Motel Harmony')
  })

  test('validates required fields when creating event', async ({ page }) => {
    const eventManagement = new EventManagementPage(page)
    
    await page.goto('/admin/eventos/novo')
    
    // Try to save without filling required fields
    await eventManagement.clickSaveButton()
    
    // An untouched required field says it is required, rather than complaining
    // about the length of what was never typed
    await expect(page.getByText('Campo obrigatório').first()).toBeVisible()

    // And the notice beside the button says the form refused to move on, so it
    // is not only the fields far above it that say so
    await expect(
      page.getByText('Há campos que precisam da sua atenção.', { exact: false })
    ).toBeVisible()
  })
})
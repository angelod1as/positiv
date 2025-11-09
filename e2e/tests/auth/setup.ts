import { test as setup } from '@playwright/test'
import { performUILogin } from '../../fixtures/auth'
import { createTestUser, generateTestEmail, generateTestPassword } from '../../utils/user-management'
import path from 'path'
import fs from 'fs/promises'

const authDir = path.join(import.meta.dirname, '..', '..', '.auth')
const adminFile = path.join(authDir, 'admin.json')
const userFile = path.join(authDir, 'user.json')

// Store created users for potential cleanup
export const setupUsers = {
  admin: null as { email: string; password: string; id: string } | null,
  user: null as { email: string; password: string; id: string } | null,
}

setup.beforeAll(async () => {
  await fs.mkdir(authDir, { recursive: true })
})

setup('authenticate as admin', async ({ page }) => {
  // Create a fresh admin user
  const email = generateTestEmail()
  const password = generateTestPassword()
  
  console.info('Creating test admin user:', email)
  const adminUser = await createTestUser(email, password, { admin: true })
  setupUsers.admin = { ...adminUser, password }
  
  // Admin should go through full login flow
  await performUILogin(page, email, password)
  
  await page.context().storageState({ path: adminFile })
  
  console.info('✅ Admin authentication state saved')
})

setup('authenticate as user', async ({ page }) => {
  // Create a fresh regular user
  const email = generateTestEmail()
  const password = generateTestPassword()

  console.info('Creating test user:', email)
  const testUser = await createTestUser(email, password)
  setupUsers.user = { ...testUser, password }

  // User goes through full login flow
  await performUILogin(page, email, password)

  // Wait a moment for any async operations to complete (like newsletter subscription)
  await page.waitForLoadState('networkidle')

  // Navigate to homepage to check if newsletter modal appears
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // If newsletter modal appears, dismiss it to ensure clean state for other tests
  const newsletterHeading = page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })
  const isModalVisible = await newsletterHeading.isVisible().catch(() => false)

  if (isModalVisible) {
    console.info('Newsletter modal detected, dismissing for clean state')
    await page.getByRole('button', { name: /talvez mais tarde/i }).click()
    await page.waitForLoadState('networkidle')
  }

  await page.context().storageState({ path: userFile })

  console.info('✅ User authentication state saved')
})
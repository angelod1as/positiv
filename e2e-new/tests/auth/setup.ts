import { test as setup } from '@playwright/test'
import { performUILogin } from '../../fixtures/auth'
import { TEST_USERS } from '../../fixtures/test-users'
import path from 'path'
import fs from 'fs/promises'

const authDir = path.join(import.meta.dirname, '..', '..', '.auth')
const adminFile = path.join(authDir, 'admin.json')
// const userFile = path.join(authDir, 'user.json')

setup.beforeAll(async () => {
  await fs.mkdir(authDir, { recursive: true })
})

setup('authenticate as admin', async ({ page }) => {
  // Admin should go straight to dashboard
  await performUILogin(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
  
  await page.context().storageState({ path: adminFile })
  
  // console.log('✅ Admin authentication state saved')
})

// TODO POS-187: Fix user onboarding flow
// setup('authenticate as user', async ({ page }) => {
//   await performUILogin(page, TEST_USERS.user1.email, TEST_USERS.user1.password)
//   
//   await page.context().storageState({ path: userFile })
//   
//   console.log('✅ User authentication state saved')
// })
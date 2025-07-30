import { chromium, type FullConfig } from "@playwright/test"

async function globalSetup(_config: FullConfig) {
  console.info("🚀 Starting global setup for E2E tests...")

  // Verify environment variables if needed
  const requiredEnvVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }

  // Pre-warm the browser if needed
  if (!process.env.CI) {
    const browser = await chromium.launch()
    await browser.close()
  }

  console.info("✅ Global setup completed")
}

export default globalSetup
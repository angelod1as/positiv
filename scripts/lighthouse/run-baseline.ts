import "dotenv/config"
import { composable, type Composable } from "composable-functions"
import { spawn } from "child_process"
import { writeFileSync, readFileSync, appendFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import lighthouse from "lighthouse"
import * as chromeLauncher from "chrome-launcher"
import { getActiveEventId } from "./get-active-event-id"
import { getAuthCookiesArray } from "./convert-playwright-auth"

interface LighthouseMetrics {
  fcp: number
  lcp: number
  tti: number
  tbt: number
  cls: number
  speedIndex: number
  performanceScore: number
}

interface TestResult {
  page: string
  url: string
  runs: LighthouseMetrics[]
  median: LighthouseMetrics
}

const BASE_URL = "http://localhost:5173"
const DOCS_DIR = join(process.cwd(), "docs", "performance-upgrade")

/**
 * Calculate median value from array of numbers
 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Extract metrics from Lighthouse result
 */
type ExtractMetrics = Composable<(result: any) => LighthouseMetrics>

const extractMetrics: ExtractMetrics = composable((result) => {
  if (!result || !result.lhr || !result.lhr.audits) {
    throw new Error("Invalid Lighthouse result")
  }

  const audits = result.lhr.audits

  // Check if all required audits exist
  const requiredAudits = [
    "first-contentful-paint",
    "largest-contentful-paint",
    "interactive",
    "total-blocking-time",
    "cumulative-layout-shift",
    "speed-index",
  ]

  for (const auditName of requiredAudits) {
    if (!audits[auditName] || audits[auditName].numericValue === undefined) {
      throw new Error(`Missing or invalid audit: ${auditName}`)
    }
  }

  if (!result.lhr.categories?.performance?.score) {
    throw new Error("Missing performance score")
  }

  return {
    fcp: audits["first-contentful-paint"].numericValue,
    lcp: audits["largest-contentful-paint"].numericValue,
    tti: audits["interactive"].numericValue,
    tbt: audits["total-blocking-time"].numericValue,
    cls: audits["cumulative-layout-shift"].numericValue,
    speedIndex: audits["speed-index"].numericValue,
    performanceScore: result.lhr.categories.performance.score * 100,
  }
})

/**
 * Calculate median metrics from multiple runs
 */
function calculateMedianMetrics(runs: LighthouseMetrics[]): LighthouseMetrics {
  return {
    fcp: median(runs.map((r) => r.fcp)),
    lcp: median(runs.map((r) => r.lcp)),
    tti: median(runs.map((r) => r.tti)),
    tbt: median(runs.map((r) => r.tbt)),
    cls: median(runs.map((r) => r.cls)),
    speedIndex: median(runs.map((r) => r.speedIndex)),
    performanceScore: median(runs.map((r) => r.performanceScore)),
  }
}

/**
 * Run Lighthouse test on a URL
 */
type RunLighthouse = Composable<
  (url: string, authCookies?: any[]) => LighthouseMetrics
>

const runLighthouse: RunLighthouse = composable(async (url, authCookies) => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] })

  try {
    const options = {
      logLevel: "info" as const,
      output: "json" as const,
      port: chrome.port,
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        requestLatencyMs: 150,
        downloadThroughputKbps: 1638.4,
        uploadThroughputKbps: 675,
        cpuSlowdownMultiplier: 4,
      },
      onlyCategories: ["performance"],
    }

    // If we have auth cookies, inject them
    if (authCookies && authCookies.length > 0) {
      // Note: Setting cookies in Lighthouse is tricky
      // For now, we'll rely on manual login or pre-authenticated Chrome profile
      console.warn(
        "Auth cookie injection not fully implemented - pages may require manual auth",
      )
    }

    const result = await lighthouse(url, options)

    if (!result) {
      throw new Error("Lighthouse returned no result")
    }

    const metricsResult = await extractMetrics(result)
    if (!metricsResult.success) {
      throw new Error(
        `Failed to extract metrics: ${JSON.stringify(metricsResult.errors)}`,
      )
    }

    return metricsResult.data
  } finally {
    await chrome.kill()
  }
})

/**
 * Run Lighthouse tests 3 times and return median values
 */
type RunTestSuite = Composable<
  (page: string, url: string, authType?: "user" | "admin") => TestResult
>

const runTestSuite: RunTestSuite = composable(async (page, url, authType) => {
  console.log(`\nTesting ${page}...`)
  console.log(`URL: ${url}`)

  let authCookies: any[] | undefined
  if (authType) {
    const cookiesResult = await getAuthCookiesArray(authType)
    if (!cookiesResult.success) {
      throw new Error(
        `Failed to get auth cookies: ${JSON.stringify(cookiesResult.errors)}`,
      )
    }
    authCookies = cookiesResult.data
  }

  const runs: LighthouseMetrics[] = []

  for (let i = 1; i <= 3; i++) {
    console.log(`  Run ${i}/3...`)
    const metricsResult = await runLighthouse(url, authCookies)

    if (!metricsResult.success) {
      console.error(
        `    ❌ Run ${i} failed: ${JSON.stringify(metricsResult.errors)} - skipping`,
      )
      continue
    }

    const metrics = metricsResult.data
    runs.push(metrics)
    console.log(
      `    FCP: ${metrics.fcp.toFixed(0)}ms, LCP: ${metrics.lcp.toFixed(0)}ms, Score: ${metrics.performanceScore.toFixed(1)}`,
    )
  }

  if (runs.length === 0) {
    throw new Error(`All 3 runs failed for ${page}`)
  }

  const medianMetrics = calculateMedianMetrics(runs)

  console.log(`  Median Results:`)
  console.log(
    `    FCP: ${medianMetrics.fcp.toFixed(0)}ms, LCP: ${medianMetrics.lcp.toFixed(0)}ms, TTI: ${medianMetrics.tti.toFixed(0)}ms`,
  )
  console.log(
    `    TBT: ${medianMetrics.tbt.toFixed(0)}ms, CLS: ${medianMetrics.cls.toFixed(3)}, SI: ${medianMetrics.speedIndex.toFixed(0)}ms`,
  )
  console.log(`    Performance Score: ${medianMetrics.performanceScore.toFixed(1)}`)

  return {
    page,
    url,
    runs,
    median: medianMetrics,
  }
})

/**
 * Write results to baseline.md
 */
function writeBaselineResults(results: TestResult[]) {
  const baselinePath = join(DOCS_DIR, "baseline.md")
  let content = readFileSync(baselinePath, "utf-8")

  const date = new Date().toISOString().split("T")[0]

  // Fill in the test environment info
  content = content.replace(/Date:\*\* _\[To be filled\]_/, `Date:** ${date}`)
  content = content.replace(
    /Tester:\*\* _\[To be filled\]_/,
    `Tester:** Automated Lighthouse Script`,
  )

  // Fill in results for each page
  for (const result of results) {
    const m = result.median
    const pageSection = result.page.replace(/[()]/g, "\\$&")

    // Fill median values
    content = content.replace(
      new RegExp(`(${pageSection}[\\s\\S]*?### Median Values[\\s\\S]*?)- \\*\\*FCP:\\*\\* _\\[ms\\]_`, "i"),
      `$1- **FCP:** ${m.fcp.toFixed(0)}ms`,
    )
    content = content.replace(
      new RegExp(`(${pageSection}[\\s\\S]*?### Median Values[\\s\\S]*?FCP[\\s\\S]*?)- \\*\\*LCP:\\*\\* _\\[ms\\]_`, "i"),
      `$1- **LCP:** ${m.lcp.toFixed(0)}ms`,
    )
    content = content.replace(
      new RegExp(`(${pageSection}[\\s\\S]*?### Median Values[\\s\\S]*?LCP[\\s\\S]*?)- \\*\\*TTI:\\*\\* _\\[ms\\]_`, "i"),
      `$1- **TTI:** ${m.tti.toFixed(0)}ms`,
    )
    content = content.replace(
      new RegExp(`(${pageSection}[\\s\\S]*?### Median Values[\\s\\S]*?TTI[\\s\\S]*?)- \\*\\*TBT:\\*\\* _\\[ms\\]_`, "i"),
      `$1- **TBT:** ${m.tbt.toFixed(0)}ms`,
    )
    content = content.replace(
      new RegExp(`(${pageSection}[\\s\\S]*?### Median Values[\\s\\S]*?TBT[\\s\\S]*?)- \\*\\*CLS:\\*\\* _\\[score\\]_`, "i"),
      `$1- **CLS:** ${m.cls.toFixed(3)}`,
    )
    content = content.replace(
      new RegExp(`(${pageSection}[\\s\\S]*?### Median Values[\\s\\S]*?CLS[\\s\\S]*?)- \\*\\*Speed Index:\\*\\* _\\[ms\\]_`, "i"),
      `$1- **Speed Index:** ${m.speedIndex.toFixed(0)}ms`,
    )
    content = content.replace(
      new RegExp(`(${pageSection}[\\s\\S]*?### Median Values[\\s\\S]*?Speed Index[\\s\\S]*?)- \\*\\*Performance Score:\\*\\* _\\[0-100\\]_`, "i"),
      `$1- **Performance Score:** ${m.performanceScore.toFixed(1)}`,
    )
  }

  writeFileSync(baselinePath, content)
  console.log(`\n✅ Updated ${baselinePath}`)
}

/**
 * Append results to metrics.csv
 */
function appendToMetricsCSV(results: TestResult[]) {
  const csvPath = join(DOCS_DIR, "metrics.csv")
  const date = new Date().toISOString().split("T")[0]

  for (const result of results) {
    const m = result.median
    const row = `POS-278,Baseline - ${result.page},${date},${result.page},${m.fcp.toFixed(0)},${m.lcp.toFixed(0)},${m.tti.toFixed(0)},${m.tbt.toFixed(0)},${m.cls.toFixed(3)},${m.speedIndex.toFixed(0)},${m.performanceScore.toFixed(1)},Initial baseline measurement\n`
    appendFileSync(csvPath, row)
  }

  console.log(`✅ Updated ${csvPath}`)
}

/**
 * Find the correct server build path (handles both standard and Vercel builds)
 */
function findServerPath(): string {
  const serverDir = join(process.cwd(), "build", "server")
  const standardBuildPath = join(serverDir, "index.js")

  if (existsSync(standardBuildPath)) {
    return standardBuildPath
  }

  // Vercel build - look for the encoded directory
  const vercelDir = readdirSync(serverDir).find(dir => dir.startsWith("nodejs_"))

  if (!vercelDir) {
    throw new Error("Could not find server build output (tried standard and Vercel paths)")
  }

  return join(serverDir, vercelDir, "index.js")
}

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Starting Performance Baseline Tests")
  console.log("=" .repeat(60))

  // Step 1: Get active event ID
  console.log("\n1️⃣  Getting active event ID from database...")
  const eventIdResult = await getActiveEventId()

  if (!eventIdResult.success) {
    console.error(
      "❌ No active event found. Please ensure database is seeded.",
      eventIdResult.errors,
    )
    process.exit(1)
  }

  const eventId = eventIdResult.data
  console.log(`✅ Found event ID: ${eventId}`)

  // Step 2: Build production app
  console.log("\n2️⃣  Building production app...")
  await new Promise<void>((resolve, reject) => {
    const build = spawn("pnpm", ["build"], { stdio: "inherit" })
    build.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Build completed")
        resolve()
      } else {
        reject(new Error(`Build failed with code ${code}`))
      }
    })
  })

  // Step 3: Start production server
  console.log("\n3️⃣  Starting production server...")
  const serverPath = findServerPath()
  console.log(`   Using server build: ${serverPath}`)
  const server = spawn("pnpm", ["react-router-serve", serverPath], { stdio: "pipe" })

  // Wait for server to be ready with health check
  console.log("   Waiting for server to respond...")
  let serverReady = false
  const maxRetries = 30
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(BASE_URL)
      if (response.status === 200 || response.status === 304) {
        serverReady = true
        break
      }
    } catch (error) {
      // Server not ready yet, wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  if (!serverReady) {
    throw new Error("Server failed to start after 30 seconds")
  }

  console.log("✅ Server started and responding")

  try {
    // Step 4: Run Lighthouse tests
    console.log("\n4️⃣  Running Lighthouse tests...")
    console.log("⚠️  Note: Authenticated pages may show login screen if auth injection fails")

    const results: TestResult[] = []

    // Test 1: Homepage (unauthenticated)
    const homepage = await runTestSuite("Homepage (/)", `${BASE_URL}/`)
    if (homepage.success) {
      results.push(homepage.data)
    } else {
      console.error("❌ Homepage test failed:", homepage.errors)
    }

    // Test 2: Dashboard (user authenticated)
    console.log("\n⚠️  For Dashboard test: Manual login may be required")
    const dashboard = await runTestSuite(
      "Dashboard (/dashboard)",
      `${BASE_URL}/dashboard`,
      "user",
    )
    if (dashboard.success) {
      results.push(dashboard.data)
    } else {
      console.error("❌ Dashboard test failed:", dashboard.errors)
    }

    // Test 3: Admin Event Management (admin authenticated)
    console.log("\n⚠️  For Admin test: Manual admin login may be required")
    const admin = await runTestSuite(
      "Admin Event Management (/admin/eventos)",
      `${BASE_URL}/admin/eventos`,
      "admin",
    )
    if (admin.success) {
      results.push(admin.data)
    } else {
      console.error("❌ Admin test failed:", admin.errors)
    }

    // Test 4: Event Details (user authenticated + event ID)
    const eventDetails = await runTestSuite(
      `Event Details Page`,
      `${BASE_URL}/dashboard/${eventId}/`,
      "user",
    )
    if (eventDetails.success) {
      results.push(eventDetails.data)
    } else {
      console.error("❌ Event Details test failed:", eventDetails.errors)
    }

    if (results.length === 0) {
      throw new Error("All tests failed - no results to write")
    }

    // Step 5: Write results
    console.log("\n5️⃣  Writing results to documentation...")
    writeBaselineResults(results)
    appendToMetricsCSV(results)

    console.log("\n" + "=".repeat(60))
    console.log("✅ Performance baseline tests completed successfully!")
    console.log("\nNext steps:")
    console.log("1. Review docs/performance-upgrade/baseline.md")
    console.log("2. Review docs/performance-upgrade/metrics.csv")
    console.log("3. Commit the results")
  } finally {
    // Step 6: Cleanup - kill server
    console.log("\n6️⃣  Cleaning up...")
    server.kill()
    console.log("✅ Server stopped")
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  })
}

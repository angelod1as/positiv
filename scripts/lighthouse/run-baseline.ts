import "dotenv/config"
import { composable, type Composable } from "composable-functions"
import { spawn } from "child_process"
import { appendFileSync, existsSync } from "fs"
import { join } from "path"
import lighthouse from "lighthouse"
import * as chromeLauncher from "chrome-launcher"

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
type ExtractMetrics = Composable<(result: unknown) => LighthouseMetrics>

const extractMetrics: ExtractMetrics = composable((result) => {
  // Type assertion after runtime validation
  const typedResult = result as {
    lhr?: {
      audits?: Record<string, { numericValue?: number }>
      categories?: { performance?: { score?: number } }
    }
  }

  if (!typedResult.lhr || !typedResult.lhr.audits) {
    throw new Error("Invalid Lighthouse result")
  }

  const audits = typedResult.lhr.audits

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

  const performanceScore = typedResult.lhr.categories?.performance?.score
  if (performanceScore === undefined || performanceScore === null) {
    throw new Error("Missing performance score")
  }

  // Extract validated values
  const fcp = audits["first-contentful-paint"].numericValue
  const lcp = audits["largest-contentful-paint"].numericValue
  const tti = audits["interactive"].numericValue
  const tbt = audits["total-blocking-time"].numericValue
  const cls = audits["cumulative-layout-shift"].numericValue
  const speedIndex = audits["speed-index"].numericValue

  // TypeScript now knows these are defined due to validation above
  if (
    fcp === undefined ||
    lcp === undefined ||
    tti === undefined ||
    tbt === undefined ||
    cls === undefined ||
    speedIndex === undefined
  ) {
    throw new Error("Audit values were validated but are still undefined")
  }

  return {
    fcp,
    lcp,
    tti,
    tbt,
    cls,
    speedIndex,
    performanceScore: performanceScore * 100,
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
type RunLighthouse = Composable<(url: string) => LighthouseMetrics>

const runLighthouse: RunLighthouse = composable(async (url) => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] })

  try {
    const options = {
      logLevel: "error" as const,
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
type RunTestSuite = Composable<(page: string, url: string) => TestResult>

const runTestSuite: RunTestSuite = composable(async (page, url) => {
  console.info(`\nTesting ${page}...`)
  console.info(`URL: ${url}`)

  const runs: LighthouseMetrics[] = []

  for (let i = 1; i <= 3; i++) {
    console.info(`  Run ${i}/3...`)
    const metricsResult = await runLighthouse(url)

    if (!metricsResult.success) {
      console.error(
        `    ❌ Run ${i} failed: ${JSON.stringify(metricsResult.errors)} - skipping`,
      )
      continue
    }

    const metrics = metricsResult.data
    runs.push(metrics)
    console.info(
      `    FCP: ${metrics.fcp.toFixed(0)}ms, LCP: ${metrics.lcp.toFixed(0)}ms, Score: ${metrics.performanceScore.toFixed(1)}`,
    )
  }

  if (runs.length === 0) {
    throw new Error(`All 3 runs failed for ${page}`)
  }

  const medianMetrics = calculateMedianMetrics(runs)

  console.info(`  Median Results:`)
  console.info(
    `    FCP: ${medianMetrics.fcp.toFixed(0)}ms, LCP: ${medianMetrics.lcp.toFixed(0)}ms, TTI: ${medianMetrics.tti.toFixed(0)}ms`,
  )
  console.info(
    `    TBT: ${medianMetrics.tbt.toFixed(0)}ms, CLS: ${medianMetrics.cls.toFixed(3)}, SI: ${medianMetrics.speedIndex.toFixed(0)}ms`,
  )
  console.info(`    Performance Score: ${medianMetrics.performanceScore.toFixed(1)}`)

  return {
    page,
    url,
    runs,
    median: medianMetrics,
  }
})

/**
 * Parse CLI arguments
 */
function parseArguments(): { taskId: string; taskName: string } {
  const args = process.argv.slice(2)
  let taskId = "POS-278"
  let taskName = "Baseline"

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--task-id" && args[i + 1]) {
      taskId = args[i + 1]
      i++
    } else if (args[i] === "--task-name" && args[i + 1]) {
      taskName = args[i + 1]
      i++
    }
  }

  return { taskId, taskName }
}

/**
 * Append results to metrics.csv
 */
function appendToMetricsCSV(
  results: TestResult[],
  taskId: string,
  taskName: string,
) {
  const csvPath = join(DOCS_DIR, "metrics.csv")
  const date = new Date().toISOString().split("T")[0]

  for (const result of results) {
    const m = result.median
    const displayName =
      taskId === "POS-278" ? `Baseline - ${result.page}` : taskName
    const row = `${taskId},${displayName},${date},${result.page},${m.fcp.toFixed(0)},${m.lcp.toFixed(0)},${m.tti.toFixed(0)},${m.tbt.toFixed(0)},${m.cls.toFixed(3)},${m.speedIndex.toFixed(0)},${m.performanceScore.toFixed(1)},\n`
    appendFileSync(csvPath, row)
  }

  console.info(`✅ Updated ${csvPath}`)
}

/**
 * Find the server build path
 */
function findServerPath(): string {
  const serverPath = join(process.cwd(), "build", "server", "index.js")

  if (!existsSync(serverPath)) {
    throw new Error("Could not find server build output at build/server/index.js")
  }

  return serverPath
}

/**
 * Main execution
 */
async function main() {
  const { taskId, taskName } = parseArguments()

  console.info("🚀 Starting Performance Baseline Tests")
  console.info("=" .repeat(60))
  console.info(`Task: ${taskId} - ${taskName}`)

  // Step 1: Build production app
  console.info("\n1️⃣  Building production app...")
  await new Promise<void>((resolve, reject) => {
    const build = spawn("pnpm", ["build"], { stdio: "inherit" })
    build.on("close", (code) => {
      if (code === 0) {
        console.info("✅ Build completed")
        resolve()
      } else {
        reject(new Error(`Build failed with code ${code}`))
      }
    })
  })

  // Step 2: Start production server
  console.info("\n2️⃣  Starting production server...")
  const serverPath = findServerPath()
  console.info(`   Using server build: ${serverPath}`)

  const server = spawn("pnpm", ["react-router-serve", serverPath], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: "5173",
      NODE_ENV: "production",
    },
  })

  // Capture server output for debugging
  server.stdout?.on("data", (data) => {
    console.info(`   [server] ${data.toString().trim()}`)
  })

  server.stderr?.on("data", (data) => {
    console.error(`   [server error] ${data.toString().trim()}`)
  })

  server.on("error", (error) => {
    console.error(`   [server spawn error]`, error)
  })

  // Wait for server to be ready with health check
  console.info("   Waiting for server to respond...")
  let serverReady = false
  const maxRetries = 30
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(BASE_URL)
      if (response.status === 200 || response.status === 304) {
        serverReady = true
        break
      }
    } catch (_error) {
      // Server not ready yet, wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  if (!serverReady) {
    throw new Error("Server failed to start after 30 seconds")
  }

  console.info("✅ Server started and responding")

  try {
    // Step 3: Run Lighthouse tests
    console.info("\n3️⃣  Running Lighthouse tests...")
    console.info("   Testing unauthenticated pages only (see POS-281 for authenticated pages)")

    const results: TestResult[] = []

    // Test: Homepage (unauthenticated)
    const homepage = await runTestSuite("Homepage (/)", `${BASE_URL}/`)
    if (homepage.success) {
      results.push(homepage.data)
    } else {
      console.error("❌ Homepage test failed:", homepage.errors)
    }

    if (results.length === 0) {
      throw new Error("Homepage test failed - no results to write")
    }

    // Step 4: Write results
    console.info("\n4️⃣  Writing results to CSV...")
    appendToMetricsCSV(results, taskId, taskName)

    console.info("\n" + "=".repeat(60))
    console.info("✅ Performance baseline tests completed successfully!")
    console.info("\nNext steps:")
    console.info("1. Review docs/performance-upgrade/metrics.csv")
    console.info("2. Commit the results")
  } finally {
    // Step 5: Cleanup - kill server
    console.info("\n5️⃣  Cleaning up...")
    server.kill()
    console.info("✅ Server stopped")
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  })
}

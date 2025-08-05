import { chromium, type FullConfig } from "@playwright/test"
import { spawn } from "child_process"
import { existsSync, statSync, readdirSync } from "fs"
import { join } from "path"

async function buildApplication(): Promise<void> {
  console.info("🔨 Building application for production...")
  
  return new Promise((resolve, reject) => {
    const buildProcess = spawn("pnpm", ["build"], {
      stdio: "inherit",
      shell: true,
    })
    
    buildProcess.on("close", (code) => {
      if (code === 0) {
        console.info("✅ Build completed successfully")
        resolve()
      } else {
        reject(new Error(`Build failed with code ${code}`))
      }
    })
    
    buildProcess.on("error", (error) => {
      reject(error)
    })
  })
}

function getLatestModificationTime(dir: string): number {
  let latestTime = 0
  
  function checkDirectory(path: string) {
    try {
      const stats = statSync(path)
      
      if (stats.isDirectory()) {
        // Skip node_modules and build directories
        if (path.includes("node_modules") || path.includes("build")) {
          return
        }
        
        const files = readdirSync(path)
        for (const file of files) {
          checkDirectory(join(path, file))
        }
      } else if (stats.isFile()) {
        // Only check source files
        if (path.match(/\.(ts|tsx|js|jsx|css|json)$/)) {
          latestTime = Math.max(latestTime, stats.mtime.getTime())
        }
      }
    } catch (error) {
      // Skip files/directories that can't be accessed (permissions, broken symlinks, etc.)
      console.warn(`Skipping ${path}: ${error}`)
    }
  }
  
  checkDirectory(dir)
  return latestTime
}

async function shouldRebuild(): Promise<boolean> {
  // Always rebuild in CI
  if (process.env.CI) {
    console.info("🔄 CI environment detected - forcing rebuild")
    return true
  }
  
  const buildDir = join(process.cwd(), "build")
  const srcDir = join(process.cwd(), "app")
  const packageJsonPath = join(process.cwd(), "package.json")
  
  // If build doesn't exist, we need to build
  if (!existsSync(buildDir)) {
    console.info("🔨 Build directory not found - build required")
    return true
  }
  
  // Get build directory modification time
  const buildTime = statSync(buildDir).mtime.getTime()
  
  // Check package.json modification time (dependencies might have changed)
  const packageJsonTime = statSync(packageJsonPath).mtime.getTime()
  if (packageJsonTime > buildTime) {
    console.info("📦 package.json modified - rebuild required")
    return true
  }
  
  // Check if any source files are newer than the build
  const latestSrcTime = getLatestModificationTime(srcDir)
  
  if (latestSrcTime > buildTime) {
    console.info("📝 Source files modified - rebuild required")
    return true
  }
  
  return false
}

async function startProductionServer(): Promise<void> {
  const { startProductionServer } = await import("./serve-production")
  await startProductionServer()
  
  // Give the server a moment to fully initialize
  await new Promise(resolve => setTimeout(resolve, 1000))
}

async function globalSetup(_config: FullConfig) {
  console.info("🚀 Starting global setup for E2E tests...")

  // Verify environment variables if needed
  const requiredEnvVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }
  
  // Build the application if needed
  if (await shouldRebuild()) {
    await buildApplication()
  } else {
    console.info("♻️  Using cached build")
  }
  
  // Start the production server
  await startProductionServer()

  // Pre-warm the browser if needed
  if (!process.env.CI) {
    const browser = await chromium.launch()
    await browser.close()
  }

  console.info("✅ Global setup completed")
  
  // Store a flag that the server is running for teardown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).__PRODUCTION_SERVER_RUNNING__ = true
}

export default globalSetup
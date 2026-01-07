import { spawn } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import { join, resolve, isAbsolute } from "node:path"

const PORT = 5173

let serverProcess: ChildProcess | null = null

/**
 * Validates that a path is safe to use and points to a legitimate file
 * @param filePath The path to validate
 * @param expectedDir The directory the file should be within
 * @returns The validated absolute path
 * @throws Error if path is invalid or unsafe
 */
function validateServerPath(filePath: string, expectedDir: string): string {
  // Ensure the path is absolute
  const absolutePath = isAbsolute(filePath) ? filePath : resolve(filePath)
  
  // Ensure the path exists and is a file
  if (!existsSync(absolutePath)) {
    throw new Error(`Server path does not exist: ${absolutePath}`)
  }
  
  const stats = statSync(absolutePath)
  if (!stats.isFile()) {
    throw new Error(`Server path is not a file: ${absolutePath}`)
  }
  
  // Ensure the file is within the expected directory (prevent directory traversal)
  const normalizedPath = resolve(absolutePath)
  const normalizedExpectedDir = resolve(expectedDir)
  
  if (!normalizedPath.startsWith(normalizedExpectedDir)) {
    throw new Error(`Server path is outside expected directory: ${absolutePath}`)
  }
  
  // Check file extension
  if (!normalizedPath.endsWith('.js')) {
    throw new Error(`Server path must be a JavaScript file: ${absolutePath}`)
  }
  
  return normalizedPath
}

async function startProductionServer() {
  const serverDir = join(process.cwd(), "build", "server")
  const serverPath = validateServerPath(join(serverDir, "index.js"), serverDir)

  return new Promise<void>((resolve, reject) => {
    serverProcess = spawn("pnpm", ["react-router-serve", serverPath], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: "production",
      },
      detached: false,
      killSignal: "SIGTERM"
    })
    
    let serverStarted = false
    
    // Add timeout to prevent hanging if server fails to start
    const startupTimeout = setTimeout(() => {
      if (!serverStarted) {
        if (serverProcess) {
          serverProcess.kill("SIGTERM")
        }
        reject(new Error(`Server failed to start within 30 seconds`))
      }
    }, 30000)
    
    serverProcess.stdout?.on("data", (data) => {
      const message = data.toString()
      console.info(message.trim())
      
      if (!serverStarted && message.includes(`localhost:${PORT}`)) {
        serverStarted = true
        clearTimeout(startupTimeout)
        resolve()
      }
    })
    
    serverProcess.stderr?.on("data", (data) => {
      console.error(data.toString())
    })
    
    serverProcess.on("error", (error) => {
      clearTimeout(startupTimeout)
      reject(error)
    })
    
    serverProcess.on("exit", (code) => {
      clearTimeout(startupTimeout)
      if (code !== 0 && code !== null && !serverStarted) {
        reject(new Error(`Server process exited with code ${code}`))
      }
    })
  })
}

function stopProductionServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve()
      return
    }
    
    const processToKill = serverProcess
    serverProcess = null
    
    // Set up exit handler
    processToKill.on("exit", () => {
      resolve()
    })
    
    // Try graceful shutdown first
    processToKill.kill("SIGTERM")
    
    // Force kill after 5 seconds if still running
    const killTimeout = setTimeout(() => {
      try {
        processToKill.kill("SIGKILL")
      } catch (_error) {
        // Process might already be dead
      }
    }, 5000)
    
    // Clean up timeout if process exits
    processToKill.once("exit", () => {
      clearTimeout(killTimeout)
    })
  })
}

export { startProductionServer, stopProductionServer }
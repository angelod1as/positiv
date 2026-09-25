import { spawn } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import { join, resolve, isAbsolute } from "node:path"
import {
  E2E_ASAAS_API_KEY,
  E2E_ASAAS_WEBHOOK_TOKEN,
  startAsaasMockServer,
  stopAsaasMockServer,
} from "./mocks/asaas-mock-server"
import { getAsaasMockUrl, getBaseUrl, getServerPort } from "./utils/run-context"

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
  const port = getServerPort()
  const serverDir = join(process.cwd(), "build", "server")
  const serverPath = validateServerPath(join(serverDir, "index.js"), serverDir)

  const asaasUrl = getAsaasMockUrl()
  // The suite runs under `varlock run`, which passes its children the
  // environment it resolved as one blob, and a server that finds the blob reads
  // nothing else. Without it, the server's own `varlock run` resolves .env
  // again with the overrides below on top.
  const { __VARLOCK_ENV: _blob, _VARLOCK_ENV_KEY: _blobKey, ...inherited } = process.env

  return new Promise<void>((resolve, reject) => {
    const asaasListening = startAsaasMockServer(Number(new URL(asaasUrl).port))
    asaasListening.catch(reject)

    serverProcess = spawn("pnpm", ["exec", "varlock", "run", "--", "react-router-serve", serverPath], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
      env: {
        ...inherited,
        PORT: String(port),
        NODE_ENV: "production",
        // Payment emails are built with no request to take a host from (the
        // retry sweep sends them too), so without APP_URL their link comes
        // out relative and the template refuses it. CI sets none.
        APP_URL: getBaseUrl(),
        // Set here rather than in .env so the suite always talks to the mock,
        // never to the sandbox key a developer keeps locally.
        PAYMENTS_ENABLED: "true",
        ASAAS_API_URL: `${asaasUrl}/v3`,
        ASAAS_API_KEY: E2E_ASAAS_API_KEY,
        ASAAS_WEBHOOK_TOKEN: E2E_ASAAS_WEBHOOK_TOKEN,
        ASAAS_ANTICIPATION_DETACHED_MONTHLY_RATE: "",
        ASAAS_ANTICIPATION_INSTALLMENT_MONTHLY_RATE: "",
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
      
      if (!serverStarted && message.includes(`localhost:${port}`)) {
        serverStarted = true
        clearTimeout(startupTimeout)
        asaasListening.then(() => resolve(), reject)
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
  return stopAppServer().then(stopAsaasMockServer)
}

function stopAppServer(): Promise<void> {
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
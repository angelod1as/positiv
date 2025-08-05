import { spawn } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

const PORT = 5173

let serverProcess: ChildProcess | null = null

async function startProductionServer() {
  // Check if we have a standard build or Vercel build
  const serverDir = join(process.cwd(), "build", "server")
  const standardBuildPath = join(serverDir, "index.js")
  
  let serverPath: string
  let isVercelBuild = false
  
  if (existsSync(standardBuildPath)) {
    // Standard build
    serverPath = standardBuildPath
  } else {
    // Vercel build - look for the encoded directory
    const vercelDir = readdirSync(serverDir).find(dir => dir.startsWith("nodejs_"))
    
    if (!vercelDir) {
      throw new Error("Could not find server build output")
    }
    
    serverPath = join(serverDir, vercelDir, "index.js")
    isVercelBuild = true
  }
  
  if (isVercelBuild) {
    // For Vercel builds, use a custom Express server
    const wrapperScript = `
      const express = require('express');
      const { join } = require('path');
      const compression = require('compression');
      
      const app = express();
      const PORT = ${PORT};
      
      // Enable compression
      app.use(compression());
      
      // Serve static files
      app.use(express.static(join(process.cwd(), 'build/client'), {
        maxAge: '1h',
        setHeaders: (res, path) => {
          if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
        }
      }));
      
      // Import the Vercel server build
      const serverBuild = require('${serverPath.replace(/\\/g, '\\\\')}');
      const { createRequestHandler } = require('@react-router/express');
      
      // Create the request handler with the build
      const requestHandler = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV || 'production'
      });
      
      // Handle all other requests with React Router
      app.all('*', requestHandler);
      
      // Start server
      app.listen(PORT, () => {
        console.info('Production server running at http://localhost:' + PORT);
      });
    `;
    
    return new Promise<void>((resolve, reject) => {
      serverProcess = spawn("node", ["-e", wrapperScript], {
        stdio: ["ignore", "pipe", "pipe"],
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "production",
        }
      })
      
      let serverStarted = false
      
      serverProcess.stdout?.on("data", (data) => {
        const message = data.toString()
        console.info(message.trim())
        
        if (!serverStarted && message.includes("Production server running")) {
          serverStarted = true
          resolve()
        }
      })
      
      serverProcess.stderr?.on("data", (data) => {
        console.error(data.toString())
      })
      
      serverProcess.on("error", (error) => {
        reject(error)
      })
      
      serverProcess.on("exit", (code) => {
        if (code !== 0 && code !== null && !serverStarted) {
          reject(new Error(`Server process exited with code ${code}`))
        }
      })
    })
  } else {
    // For standard builds, use react-router-serve
    return new Promise<void>((resolve, reject) => {
      serverProcess = spawn("pnpm", ["react-router-serve", serverPath], {
        stdio: ["ignore", "pipe", "pipe"],
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: String(PORT),
          NODE_ENV: "production",
        }
      })
      
      let serverStarted = false
      
      serverProcess.stdout?.on("data", (data) => {
        const message = data.toString()
        console.info(message.trim())
        
        if (!serverStarted && message.includes(`localhost:${PORT}`)) {
          serverStarted = true
          resolve()
        }
      })
      
      serverProcess.stderr?.on("data", (data) => {
        console.error(data.toString())
      })
      
      serverProcess.on("error", (error) => {
        reject(error)
      })
      
      serverProcess.on("exit", (code) => {
        if (code !== 0 && code !== null && !serverStarted) {
          reject(new Error(`Server process exited with code ${code}`))
        }
      })
    })
  }
}

function stopProductionServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve()
      return
    }
    
    serverProcess.on("exit", () => {
      serverProcess = null
      resolve()
    })
    
    serverProcess.kill("SIGTERM")
    
    // Force kill after 5 seconds
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill("SIGKILL")
      }
    }, 5000)
  })
}

export { startProductionServer, stopProductionServer }
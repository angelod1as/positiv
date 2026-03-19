import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http"

interface AsaasCall {
  method: string
  path: string
  body: Record<string, unknown>
  timestamp: number
}

let calls: AsaasCall[] = []
let server: Server | null = null

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  let body = ""
  req.on("data", (chunk: string) => (body += chunk))
  req.on("end", () => {
    const parsed: Record<string, unknown> = body ? JSON.parse(body) : {}
    const method = req.method ?? "UNKNOWN"
    const url = req.url ?? "/"

    calls.push({
      method,
      path: url,
      body: parsed,
      timestamp: Date.now(),
    })

    res.setHeader("Content-Type", "application/json")

    // POST /api/v3/customers
    if (method === "POST" && url === "/api/v3/customers") {
      res.end(JSON.stringify({ id: `cus_mock_${Date.now()}` }))
      return
    }

    // POST /api/v3/payments
    if (method === "POST" && url === "/api/v3/payments") {
      res.end(JSON.stringify({
        id: `pay_mock_${Date.now()}`,
        invoiceUrl: "http://localhost:5173/",
      }))
      return
    }

    // POST /api/v3/payments/:id/refund
    if (method === "POST" && url.match(/^\/api\/v3\/payments\/[^/]+\/refund$/)) {
      const id = url.split("/")[4]
      res.end(JSON.stringify({ id, status: "REFUNDED" }))
      return
    }

    // DELETE /api/v3/payments/:id
    if (method === "DELETE" && url.match(/^\/api\/v3\/payments\/[^/]+$/)) {
      const id = url.split("/")[4]
      res.end(JSON.stringify({ deleted: true, id }))
      return
    }

    res.statusCode = 404
    res.end(JSON.stringify({ error: "Unknown Asaas mock endpoint", url, method }))
  })
}

export function startAsaasMockServer(port = 9999): Promise<void> {
  return new Promise((resolve) => {
    server = createServer(handleRequest)
    server.listen(port, () => {
      console.info(`Asaas mock server running on port ${port}`)
      resolve()
    })
  })
}

export function stopAsaasMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.info("Asaas mock server stopped")
        resolve()
      })
    } else {
      resolve()
    }
  })
}

export function getAsaasCalls(): AsaasCall[] {
  return [...calls]
}

export function clearAsaasCalls(): void {
  calls = []
}

export function getAsaasCallsByMethod(method: string): AsaasCall[] {
  return calls.filter((c) => c.method === method)
}

export function getAsaasCallsByPath(pathPattern: RegExp): AsaasCall[] {
  return calls.filter((c) => pathPattern.test(c.path))
}

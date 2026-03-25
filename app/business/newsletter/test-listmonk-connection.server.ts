import { LISTMONK_ADMIN_LIST_ID } from "~/lib/constants/constants"
import { logger } from "~/lib/logger/logger.server"
import { getListmonkConfig } from "./listmonk-client.server"

type DiagnosticStep = {
  label: string
  status: "ok" | "error"
  error?: string
}

export type DiagnosticResult = {
  success: boolean
  steps: DiagnosticStep[]
}

export async function testListmonkConnection(): Promise<DiagnosticResult> {
  const steps: DiagnosticStep[] = []
  let campaignId: number | null = null
  let failed = false

  const { listmonkApiUrl, headers } = getListmonkConfig()

  // Step 1: Test connection
  try {
    const response = await fetch(`${listmonkApiUrl}/api/subscribers`, {
      headers,
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    steps.push({ label: "Conexão estabelecida", status: "ok" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    steps.push({
      label: "Conexão estabelecida",
      status: "error",
      error: message,
    })
    return { success: false, steps }
  }

  // Step 2: Create test campaign
  try {
    const response = await fetch(`${listmonkApiUrl}/api/campaigns`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `[TESTE] Diagnóstico de conexão - ${new Date().toISOString()}`,
        subject: "[TESTE] Diagnóstico de conexão com Listmonk",
        lists: [LISTMONK_ADMIN_LIST_ID],
        type: "regular",
        content_type: "html",
        body: "<p>Este é um email de teste enviado pelo diagnóstico de conexão do painel admin.</p>",
      }),
    })
    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read error body")
      throw new Error(`${response.status}: ${errorBody}`)
    }
    const result = (await response.json()) as { data: { id: number } }
    campaignId = result.data.id
    steps.push({ label: "Campanha de teste criada", status: "ok" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    steps.push({
      label: "Campanha de teste criada",
      status: "error",
      error: message,
    })
    return { success: false, steps }
  }

  // Step 3: Send campaign
  try {
    const response = await fetch(
      `${listmonkApiUrl}/api/campaigns/${campaignId}/status`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "running" }),
      },
    )
    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read error body")
      throw new Error(`${response.status}: ${errorBody}`)
    }
    steps.push({ label: "Email enviado para admins", status: "ok" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    steps.push({
      label: "Email enviado para admins",
      status: "error",
      error: message,
    })
    failed = true
  }

  // Step 4: Cleanup — always runs if campaign was created
  try {
    const response = await fetch(
      `${listmonkApiUrl}/api/campaigns/${campaignId}`,
      {
        method: "DELETE",
        headers,
      },
    )
    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read error body")
      throw new Error(`${response.status}: ${errorBody}`)
    }
    steps.push({ label: "Campanha de teste removida", status: "ok" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    steps.push({
      label: "Campanha de teste removida",
      status: "error",
      error: message,
    })
    failed = true
  }

  if (failed) {
    logger.error("Listmonk diagnostic test failed", { steps })
  }

  return { success: !failed, steps }
}

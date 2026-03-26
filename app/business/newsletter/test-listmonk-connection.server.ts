import { LISTMONK_DEVELOPERS_LIST_ID } from "~/lib/constants/constants"
import { logger } from "~/lib/logger/logger.server"
import { getListmonkConfig } from "./listmonk-client.server"
import type { CleanupResult, DiagnosticResult } from "./test-listmonk-connection.types"

export type { CleanupResult, DiagnosticResult } from "./test-listmonk-connection.types"

export async function testListmonkConnection(): Promise<DiagnosticResult> {
  const steps: DiagnosticResult["steps"] = []
  let campaignId: number | null = null

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
    return { success: false, campaignId: null, steps }
  }

  // Step 2: Create test campaign
  try {
    const response = await fetch(`${listmonkApiUrl}/api/campaigns`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `[TESTE] Diagnóstico de conexão - ${new Date().toISOString()}`,
        subject: "[TESTE] Diagnóstico de conexão com Listmonk",
        lists: [LISTMONK_DEVELOPERS_LIST_ID],
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
    return { success: false, campaignId: null, steps }
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
    steps.push({ label: "Email enviado para devs", status: "ok" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    steps.push({
      label: "Email enviado para devs",
      status: "error",
      error: message,
    })
    logger.error("Listmonk diagnostic test failed at send step", { steps })
    return { success: false, campaignId, steps }
  }

  return { success: true, campaignId, steps }
}

export async function cleanupListmonkTestCampaign(
  campaignId: number,
): Promise<CleanupResult> {
  const { listmonkApiUrl, headers } = getListmonkConfig()

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
    return {
      success: true,
      step: { label: "Campanha de teste removida", status: "ok" },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.error("Listmonk diagnostic cleanup failed", {
      campaignId,
      error: message,
    })
    return {
      success: false,
      step: {
        label: "Campanha de teste removida",
        status: "error",
        error: message,
      },
    }
  }
}

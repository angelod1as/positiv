export type DiagnosticStep = {
  label: string
  status: "ok" | "error"
  error?: string
}

export type DiagnosticResult = {
  success: boolean
  campaignId: number | null
  steps: DiagnosticStep[]
}

export type CleanupResult = {
  success: boolean
  step: DiagnosticStep
}

import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { Button } from "~/components/ui/button"
import type {
  CleanupResult,
  DiagnosticResult,
} from "~/business/newsletter/test-listmonk-connection.types"

type TestFetcherData = {
  intent?: string
  diagnosticResult?: DiagnosticResult
}

type CleanupFetcherData = {
  intent?: string
  cleanupResult?: CleanupResult
}

export function ListmonkDiagnosticSection() {
  const testFetcher = useFetcher<TestFetcherData>()
  const cleanupFetcher = useFetcher<CleanupFetcherData>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [campaignId, setCampaignId] = useState<number | null>(null)

  const isTestSubmitting =
    testFetcher.state === "submitting" || testFetcher.state === "loading"
  const isCleanupSubmitting =
    cleanupFetcher.state === "submitting" || cleanupFetcher.state === "loading"

  const handleTestConfirm = async (closeDialog: () => void) => {
    setCampaignId(null)
    const formData = new FormData()
    formData.append("intent", "test-listmonk")
    testFetcher.submit(formData, { method: "POST" })
    closeDialog()
  }

  const handleCleanup = () => {
    if (!campaignId) return
    const formData = new FormData()
    formData.append("intent", "cleanup-listmonk")
    formData.append("campaignId", String(campaignId))
    cleanupFetcher.submit(formData, { method: "POST" })
  }

  useEffect(() => {
    if (
      testFetcher.data?.intent !== "test-listmonk" ||
      !testFetcher.data.diagnosticResult
    )
      return

    const { success, steps, campaignId: resultCampaignId } =
      testFetcher.data.diagnosticResult

    if (resultCampaignId) {
      setCampaignId(resultCampaignId)
    }

    steps.forEach((step, index) => {
      const delay = index * 800
      setTimeout(() => {
        if (step.status === "ok") {
          toast.success(`✓ ${step.label}`, { duration: 6000 })
        } else {
          toast.error(`✗ ${step.label}`, {
            description: step.error,
            duration: 12000,
          })
        }
      }, delay)
    })

    if (!success && !resultCampaignId) {
      setTimeout(() => {
        toast.error("Diagnóstico falhou antes de criar a campanha", {
          duration: 8000,
        })
      }, steps.length * 800)
    }
  }, [testFetcher.data])

  useEffect(() => {
    if (
      cleanupFetcher.data?.intent !== "cleanup-listmonk" ||
      !cleanupFetcher.data.cleanupResult
    )
      return

    const { success, step } = cleanupFetcher.data.cleanupResult

    if (success) {
      toast.success(`✓ ${step.label}`, { duration: 6000 })
      setCampaignId(null)
    } else {
      toast.error(`✗ ${step.label}`, {
        description: step.error,
        duration: 12000,
      })
    }
  }, [cleanupFetcher.data])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2>Diagnóstico de Email</h2>
          <p className="text-sm text-muted-foreground">
            Essa ferramenta testa a conexão com o serviço de newsletter
            (Listmonk) e envia uma campanha de teste para os desenvolvedores.
            Use quando quiser verificar se os emails de abertura de evento estão
            funcionando.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <ConfirmDialog
          title="Testar conexão?"
          description="Será enviado um email de teste para todos os desenvolvedores cadastrados na lista de devs do Listmonk."
          confirmLabel="Testar"
          cancelLabel="Cancelar"
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          isLoading={isTestSubmitting}
          onConfirm={handleTestConfirm}
        >
          <ConfirmDialog.Trigger
            variant="outline"
            disabled={isTestSubmitting}
          >
            {isTestSubmitting ? "Testando..." : "Testar conexão com Listmonk"}
          </ConfirmDialog.Trigger>
        </ConfirmDialog>

        {campaignId && (
          <Button
            variant="destructive"
            size="default"
            onClick={handleCleanup}
            disabled={isCleanupSubmitting}
          >
            {isCleanupSubmitting
              ? "Limpando..."
              : "Limpar campanha de teste"}
          </Button>
        )}
      </div>
    </div>
  )
}

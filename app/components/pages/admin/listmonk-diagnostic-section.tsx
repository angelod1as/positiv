import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { Button } from "~/components/ui/button"
import { listmonkDiagnosticCopy } from "~/copy/admin"
import { sharedCopy } from "~/copy/shared"
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
          toast.success(listmonkDiagnosticCopy.stepOk(step.label), {
            duration: 6000,
          })
        } else {
          toast.error(listmonkDiagnosticCopy.stepFailed(step.label), {
            description: step.error,
            duration: 12000,
          })
        }
      }, delay)
    })

    if (!success && !resultCampaignId) {
      setTimeout(() => {
        toast.error(listmonkDiagnosticCopy.failedBeforeCampaign, {
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
      toast.success(listmonkDiagnosticCopy.stepOk(step.label), {
        duration: 6000,
      })
      setCampaignId(null)
    } else {
      toast.error(listmonkDiagnosticCopy.stepFailed(step.label), {
        description: step.error,
        duration: 12000,
      })
    }
  }, [cleanupFetcher.data])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2>{listmonkDiagnosticCopy.title}</h2>
          <p className="text-sm text-muted-foreground">
            {listmonkDiagnosticCopy.description}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <ConfirmDialog
          title={listmonkDiagnosticCopy.confirmTitle}
          description={listmonkDiagnosticCopy.confirmDescription}
          confirmLabel={listmonkDiagnosticCopy.confirmLabel}
          cancelLabel={sharedCopy.actions.cancel}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          isLoading={isTestSubmitting}
          onConfirm={handleTestConfirm}
        >
          <ConfirmDialog.Trigger
            variant="outline"
            disabled={isTestSubmitting}
          >
            {isTestSubmitting
              ? listmonkDiagnosticCopy.testing
              : listmonkDiagnosticCopy.test}
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
              ? listmonkDiagnosticCopy.cleaning
              : listmonkDiagnosticCopy.clean}
          </Button>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import type { DiagnosticResult } from "~/business/newsletter/test-listmonk-connection.server"

type FetcherData = {
  intent?: string
  diagnosticResult?: DiagnosticResult
}

export function ListmonkDiagnosticSection() {
  const fetcher = useFetcher<FetcherData>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const isSubmitting =
    fetcher.state === "submitting" || fetcher.state === "loading"

  const handleConfirm = async (closeDialog: () => void) => {
    const formData = new FormData()
    formData.append("intent", "test-listmonk")
    fetcher.submit(formData, { method: "POST" })
    closeDialog()
  }

  useEffect(() => {
    if (fetcher.data?.intent !== "test-listmonk" || !fetcher.data.diagnosticResult) return

    const { success, steps } = fetcher.data.diagnosticResult
    const stepsText = steps
      .map((s) =>
        s.status === "ok"
          ? `✓ ${s.label}`
          : `✗ ${s.label}${s.error ? `: ${s.error}` : ""}`,
      )
      .join("\n")

    if (success) {
      toast.success("Conexão com Listmonk OK!", {
        description: stepsText,
        duration: 8000,
      })
    } else {
      const firstError = steps.find((s) => s.status === "error")
      toast.error(
        firstError?.error
          ? `${firstError.label}: ${firstError.error}`
          : "Falha no diagnóstico",
        {
          description: stepsText,
          duration: 12000,
        },
      )
    }
  }, [fetcher.data])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2>Diagnóstico de Email</h2>
          <p className="text-sm text-muted-foreground">
            Essa ferramenta testa a conexão com o serviço de newsletter
            (Listmonk) e envia uma campanha de teste para os administradores.
            Use quando quiser verificar se os emails de abertura de evento estão
            funcionando.
          </p>
        </div>
      </div>

      <div>
        <ConfirmDialog
          title="Testar conexão?"
          description="Será enviado um email de teste para todos os administradores cadastrados na lista de admins do Listmonk."
          confirmLabel="Testar"
          cancelLabel="Cancelar"
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          isLoading={isSubmitting}
          onConfirm={handleConfirm}
        >
          <ConfirmDialog.Trigger
            variant="outline"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Testando..." : "Testar conexão com Listmonk"}
          </ConfirmDialog.Trigger>
        </ConfirmDialog>
      </div>
    </div>
  )
}

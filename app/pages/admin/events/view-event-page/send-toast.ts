import { toast } from "sonner"
import type { FetcherData } from "./view-event-page"

export const sendToast = (fetcherData: FetcherData) => {
  if (!fetcherData) {
    return
  }

  if (!fetcherData.success) {
    return toast.error(
      `Houve um erro: ${fetcherData?.errors?._global?.join("; ")}`,
    )
  }

  if (fetcherData.intent === "send-reminders") {
    return toast.success("E-mails colocados na fila de envio com sucesso")
  }

  if (fetcherData.intent === "update-event-status") {
    return toast.success("Status atualizado com sucesso")
  }
}

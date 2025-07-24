import { toast } from "sonner"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import type { ComposableFetcherData } from "~types/database/entities.types"

export const sendToast = (fetcherData: ComposableFetcherData) => {
  if (!fetcherData) {
    return
  }

  if (!fetcherData.success && fetcherData.errors) {
    const errors = Object.entries(fetcherData.errors).map((entry) => (
      <DataPair key={entry[0]} pair={entry} />
    ))
    return toast.error(
      <div>
        <p>
          <b>Erro:</b>
        </p>
        {errors}
      </div>,
    )
  }

  if (fetcherData.intent === "update-event-participant") {
    if (!fetcherData.success) {
      return toast.error("Ops, algo deu errado")
    }
    return toast.success("Dados atualizados com sucesso")
  }

  if (fetcherData.intent === "send-reminders") {
    return toast.success("E-mails colocados na fila de envio com sucesso")
  }

  if (fetcherData.intent === "update-event-status") {
    return toast.success("Status atualizado com sucesso")
  }

  if (fetcherData.intent === "update-demographics") {
    return toast.success("Demografia atualizada com sucesso")
  }

  return toast.info(
    "A função foi executada mas não há um intent configurado para mostrar uma mensagem compatível",
  )
}

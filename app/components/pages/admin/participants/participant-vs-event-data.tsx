import { type FC, useEffect } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import { z } from "zod"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { TextArea } from "~/components/ui/textarea"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import {
  applicationStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import { useAutoSaveForm } from "~/lib/hooks/use-auto-save-form"
import type { PaymentRequestRow } from "~/business/payment/payment-request.server"
import type {
  ComposableFetcherData,
  EventParticipantWithEvent,
} from "~types/database/entities.types"

const eventParticipantFormSchema = z.object({
  attendance_status: z.string(),
  application_status: z.string(),
  spot_type: z.string(),
  payment: z.coerce.number().min(0, "O valor não pode ser negativo"),
  has_paid: z.boolean(),
  was_selected_for_rotation: z.boolean(),
  admin_general_notes: z.string(),
})

type ParticipantVsEventDataProps = {
  eventParticipant: EventParticipantWithEvent
  paymentRequest?: PaymentRequestRow | null
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  expired: "Expirado",
  refunded: "Reembolsado",
  partially_refunded: "Parcialmente reembolsado",
  cancelled: "Cancelado",
}

const BILLING_TYPE_LABELS: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de Crédito",
  manual: "Manual",
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export const ParticipantVsEventData: FC<ParticipantVsEventDataProps> = ({
  eventParticipant,
  paymentRequest,
}) => {
  const {
    id,
    event_id,
    profile_id,
    application_date,
    attendance_status,
    application_status,
    spot_type,
    payment,
    has_paid,
    was_selected_for_rotation,
    admin_general_notes,
    bond,
    companions,
    notes,
    referrals,
    referred,
  } = eventParticipant

  const fetcher = useFetcher<ComposableFetcherData>()
  const resendFetcher = useFetcher<ComposableFetcherData>()

  const handleResendPaymentLink = () => {
    const formData = new FormData()
    formData.set("intent", "resend-payment-link")
    formData.set("id", id)
    formData.set("event_id", event_id)
    formData.set("profile_id", profile_id ?? "")
    resendFetcher.submit(formData, { method: "POST" })
  }

  const refundFetcher = useFetcher<ComposableFetcherData>()

  const handleRefund = () => {
    const formData = new FormData()
    formData.set("intent", "refund-payment")
    formData.set("id", id)
    formData.set("event_id", event_id)
    formData.set("profile_id", profile_id ?? "")
    refundFetcher.submit(formData, { method: "POST" })
  }

  const isResending = resendFetcher.state !== "idle"
  const isRefunding = refundFetcher.state !== "idle"
  const isAsaasManaged = paymentRequest != null && paymentRequest.billing_type !== "manual"

  useEffect(() => {
    if (fetcher.data?.paymentSent === true) {
      toast.success("Link de pagamento enviado com sucesso")
    }
    if (fetcher.data?.paymentSent === false) {
      toast.error("Dados atualizados, mas houve um erro ao enviar o link de pagamento. Tente novamente.", { duration: Infinity, closeButton: true })
    }
  }, [fetcher.data])

  useEffect(() => {
    if (resendFetcher.data?.paymentSent === true) {
      toast.success("Link de pagamento reenviado com sucesso")
    }
    if (resendFetcher.data?.paymentSent === false) {
      toast.error("Erro ao reenviar link de pagamento. Tente novamente.", { duration: Infinity, closeButton: true })
    }
  }, [resendFetcher.data])

  useEffect(() => {
    if (refundFetcher.data?.success === true) {
      toast.success("Reembolso realizado com sucesso")
    }
    if (refundFetcher.data?.success === false) {
      toast.error("Erro ao processar reembolso. Tente novamente.", { duration: Infinity, closeButton: true })
    }
  }, [refundFetcher.data])

  const { register } = useAutoSaveForm({
    schema: eventParticipantFormSchema,
    initialData: {
      attendance_status,
      application_status,
      spot_type,
      payment: payment ?? 0,
      has_paid,
      was_selected_for_rotation,
      admin_general_notes: admin_general_notes ?? "",
    },
    fetcher,
    onSubmit: (field, value) => {
      const formData = new FormData()
      formData.set("intent", "update-event-participant")
      formData.set("id", id)
      formData.set("profile_id", profile_id ?? "")
      formData.set("event_id", event_id)
      formData.set(field, String(value))
      fetcher.submit(formData, { method: "POST" })
    },
  })

  return (
    <div className="space-y-4">
      <h3>Neste evento</h3>
      <div className="space-y-8">
        <div className="space-y-2">
          <h4>Administração</h4>

          <div className="space-y-4">
            <div className="lg:flex gap-4 [&>*]:flex-1">
              <div className="space-y-2">
                <Label htmlFor="attendance_status">Status de Presença</Label>
                <Select {...register.select("attendance_status")}>
                  <SelectTrigger id="attendance_status">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="application_status">Status de Inscrição</Label>
                <div className="flex gap-2">
                  <Select {...register.select("application_status")}>
                    <SelectTrigger id="application_status">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {applicationStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {application_status === "sent_payment_data" && isAsaasManaged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendPaymentLink}
                      disabled={isResending}
                      className="shrink-0 self-center"
                    >
                      {isResending ? "Enviando..." : "Reenviar link"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:flex gap-4 [&>*]:flex-1">
              <div className="space-y-2">
                <Label htmlFor="spot_type">Tipo de Vaga</Label>
                <Select {...register.select("spot_type")}>
                  <SelectTrigger id="spot_type">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {spotTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment">Pagamento</Label>
                <Input
                  id="payment"
                  type="number"
                  disabled={isAsaasManaged}
                  {...register.number("payment")}
                />
              </div>

              <div className="flex flex-col justify-end gap-2">
                <Label className={`flex items-center gap-2 ${isAsaasManaged ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"}`}>
                  <Checkbox
                    disabled={isAsaasManaged}
                    {...register.checkbox("has_paid")}
                  />
                  <span>Pago</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox {...register.checkbox("was_selected_for_rotation")} />
                  <span>Selecionado para Rodízio</span>
                </Label>
                {has_paid && isAsaasManaged && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isRefunding}
                      >
                        {isRefunding ? "Processando..." : "Reembolsar"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar reembolso</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja reembolsar este pagamento? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRefund}>
                          Confirmar reembolso
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_general_notes">
                Notas Gerais do Evento
              </Label>
              <TextArea
                id="admin_general_notes"
                {...register.text("admin_general_notes")}
                placeholder="Notas administrativas para este evento..."
              />
            </div>
          </div>
        </div>

        {paymentRequest && (
          <div className="space-y-2">
            <h4>Pagamento</h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <DataPair
                pair={[
                  "Status",
                  PAYMENT_STATUS_LABELS[paymentRequest.status] ?? paymentRequest.status,
                ]}
              />
              <DataPair
                pair={[
                  "Tipo",
                  BILLING_TYPE_LABELS[paymentRequest.billing_type ?? ""] ?? paymentRequest.billing_type ?? "—",
                ]}
              />
              <DataPair
                pair={[
                  "Valor",
                  formatCurrency(Number(paymentRequest.amount)),
                ]}
              />
              {paymentRequest.installment_count && paymentRequest.installment_count > 1 && (
                <DataPair
                  pair={["Parcelas", `${paymentRequest.installment_count}x`]}
                />
              )}
              {paymentRequest.invoice_url && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Link Asaas:</span>
                  <a
                    href={paymentRequest.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Abrir
                  </a>
                </div>
              )}
              {paymentRequest.paid_at && (
                <DataPair
                  pair={[
                    "Pago em",
                    formatDateTime(paymentRequest.paid_at).full,
                  ]}
                />
              )}
              {paymentRequest.refunded_at && (
                <DataPair
                  pair={[
                    "Reembolsado em",
                    formatDateTime(paymentRequest.refunded_at).full,
                  ]}
                />
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4>Respostas</h4>
          <DataPair
            pair={[
              eventParticipantPropMap("application_date"),
              formatDateTime(application_date).full,
            ]}
          />
          <DataPair
            pair={[eventParticipantPropMap("bond"), bond || "não respondeu"]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("companions"),
              companions || "não respondeu",
            ]}
          />
          <DataPair
            pair={[
              `${eventParticipantPropMap("notes")} (Participante)`,
              notes || "não respondeu",
            ]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("referrals"),
              referrals || "não respondeu",
            ]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("referred"),
              referred || "não respondeu",
            ]}
          />
        </div>
      </div>
    </div>
  )
}

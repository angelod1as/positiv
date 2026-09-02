import { useEffect, useState, type FC, type FormEvent } from "react"
import { useFetcher } from "react-router"
import type {
  ParticipantPaymentTotals,
  PaymentRow,
} from "~/business/payment/payment-totals.server"
import { Button } from "~/components/atoms/button/button"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { paymentsCopy } from "~/copy/payments"
import { formatInTimeZone } from "date-fns-tz"
import { formatCurrency } from "~/lib/helpers/format-currency"
import { formatDateTime } from "~/lib/helpers/format-date-time"

const { manage, manual, refund, cancel, errors } = paymentsCopy

/** Every payment recorded by hand arrived by PIX; nothing else is offered. */
const MANUAL_METHOD = "pix"

// Where the party is, not where the server is: past 21h in São Paulo, a UTC
// date is already tomorrow, and the admin recording that night's money would
// be offered the wrong day.
const today = () =>
  formatInTimeZone(new Date(), "America/Sao_Paulo", "yyyy-MM-dd")

export type ManagePaymentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventParticipantId: string
  participantName: string
  payments: PaymentRow[]
  totals: ParticipantPaymentTotals
  active: PaymentRow | null
}

type RefundDialogProps = {
  payment: PaymentRow
  isSubmitting: boolean
  onConfirm: (paymentId: string, amount: string) => void
}

const RefundDialog: FC<RefundDialogProps> = ({
  payment,
  isSubmitting,
  onConfirm,
}) => {
  const [amount, setAmount] = useState("")
  const amountId = `refund-amount-${payment.id}`

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          {refund.title}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{refund.confirm}</AlertDialogTitle>
          <AlertDialogDescription>{refund.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={amountId}>{refund.amount}</Label>
          <Input
            id={amountId}
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <p className="text-muted-foreground text-sm">{refund.amountHint}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{manage.close}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={() => onConfirm(payment.id, amount)}
          >
            {refund.submit}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type CancelDialogProps = {
  payment: PaymentRow
  isSubmitting: boolean
  onConfirm: (paymentId: string) => void
}

const CancelDialog: FC<CancelDialogProps> = ({
  payment,
  isSubmitting,
  onConfirm,
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline" size="sm">
        {cancel.title}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{cancel.confirm}</AlertDialogTitle>
        <AlertDialogDescription>{cancel.description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{cancel.keep}</AlertDialogCancel>
        <AlertDialogAction
          disabled={isSubmitting}
          onClick={() => onConfirm(payment.id)}
        >
          {cancel.submit}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const ManagePaymentModal: FC<ManagePaymentModalProps> = ({
  open,
  onOpenChange,
  eventParticipantId,
  participantName,
  payments,
  totals,
  active,
}) => {
  const fetcher = useFetcher<{
    success?: boolean
    intent?: string
    errors?: { message?: string }[]
  }>()

  const failure =
    fetcher.data && fetcher.data.success === false ? fetcher.data : null
  const failureMessages = failure
    ? (failure.errors ?? []).flatMap((error) => error.message ?? [])
    : []

  // A recorded payment is the end of the errand: the admin came here to write
  // it down, and the grid behind the dialog already shows the result.
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.intent === "payment-manual") {
      onOpenChange(false)
    }
  }, [fetcher.data, onOpenChange])

  const isSubmitting = fetcher.state !== "idle"

  const post = (values: Record<string, string>) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => formData.set(key, value))
    fetcher.submit(formData, { method: "POST" })
  }

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    post({
      intent: "payment-manual",
      eventParticipantId,
      amount: String(formData.get("amount") ?? ""),
      method: MANUAL_METHOD,
      paidAt: String(formData.get("paidAt") ?? ""),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{manage.title}</DialogTitle>
          <DialogDescription>
            {manage.description(participantName)}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground text-sm">
              {manage.totals.gross}
            </dt>
            <dd className="font-bold">
              {formatCurrency(totals.paid_gross - totals.refunded)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              {manage.totals.fee}
            </dt>
            <dd className="font-bold">{formatCurrency(totals.fee)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              {manage.totals.refunded}
            </dt>
            <dd className="font-bold">{formatCurrency(totals.refunded)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              {manage.totals.net}
            </dt>
            <dd className="font-bold">{formatCurrency(totals.net)}</dd>
          </div>
        </dl>

        {failure && (
          <div
            role="alert"
            className="border-destructive text-destructive rounded-md border p-3 text-sm"
          >
            {failureMessages.length > 0 ? (
              failureMessages.map((message) => <p key={message}>{message}</p>)
            ) : (
              <p>{errors.generic}</p>
            )}
          </div>
        )}

        {payments.length === 0 ? (
          <p>{manage.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{manage.columns.status}</TableHead>
                <TableHead>{manage.columns.kind}</TableHead>
                <TableHead>{manage.columns.method}</TableHead>
                <TableHead>{manage.columns.amount}</TableHead>
                <TableHead>{manage.columns.date}</TableHead>
                <TableHead>{manage.columns.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{manage.statuses[payment.status]}</TableCell>
                  <TableCell>{manage.kinds[payment.kind]}</TableCell>
                  <TableCell>
                    {payment.method
                      ? manage.methods[payment.method]
                      : manage.noMethod}
                  </TableCell>
                  <TableCell>
                    {payment.amount === null
                      ? manage.noAmount
                      : formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(payment.paid_at, "numeric").date ??
                      manage.noDate}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    {payment.kind === "manual" && payment.status === "paid" && (
                      <RefundDialog
                        payment={payment}
                        isSubmitting={isSubmitting}
                        onConfirm={(paymentId, amount) =>
                          post({
                            intent: "payment-manual-refund",
                            paymentId,
                            amount,
                          })
                        }
                      />
                    )}
                    {active?.id === payment.id && (
                      <CancelDialog
                        payment={payment}
                        isSubmitting={isSubmitting}
                        onConfirm={(paymentId) =>
                          post({ intent: "payment-cancel", paymentId })
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {active ? (
          <p>{errors.activeChargeExists}</p>
        ) : (
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
            <h3 className="font-bold">{manual.title}</h3>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-amount">{manual.amount}</Label>
              <Input
                id="manual-amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-paid-at">{manual.paidAt}</Label>
              <Input
                id="manual-paid-at"
                name="paidAt"
                type="date"
                defaultValue={today()}
                required
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {manual.submit}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

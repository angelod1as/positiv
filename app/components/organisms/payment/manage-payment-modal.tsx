import { useState, type FC, type FormEvent } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { TextArea } from "~/components/ui/textarea"
import { paymentsCopy } from "~/copy/payments"
import { formatCurrency } from "~/lib/helpers/format-currency"
import { formatDateTime } from "~/lib/helpers/format-date-time"

const { manage, manual, refund, cancel, errors } = paymentsCopy

const MANUAL_METHODS = ["pix", "cash", "transfer", "other"] as const

const today = () => new Date().toISOString().slice(0, 10)

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
  onConfirm: (paymentId: string, amount: string) => void
}

const RefundDialog: FC<RefundDialogProps> = ({ payment, onConfirm }) => {
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
          <AlertDialogAction onClick={() => onConfirm(payment.id, amount)}>
            {refund.submit}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type CancelDialogProps = {
  payment: PaymentRow
  onConfirm: (paymentId: string) => void
}

const CancelDialog: FC<CancelDialogProps> = ({ payment, onConfirm }) => (
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
        <AlertDialogAction onClick={() => onConfirm(payment.id)}>
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
  const fetcher = useFetcher()
  const [method, setMethod] = useState<string>(MANUAL_METHODS[0])

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
      method,
      paidAt: String(formData.get("paidAt") ?? ""),
      note: String(formData.get("note") ?? ""),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
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
            <dd className="font-bold">{formatCurrency(totals.paid_gross)}</dd>
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
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    {formatDateTime(payment.paid_at, "numeric").date ??
                      manage.noDate}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    {payment.kind === "manual" && payment.status === "paid" && (
                      <RefundDialog
                        payment={payment}
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
              <Label htmlFor="manual-method">{manual.method}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="manual-method">
                  <SelectValue placeholder={manual.methodPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_METHODS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {manage.methods[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-note">{manual.note}</Label>
              <TextArea id="manual-note" name="note" />
            </div>

            <Button type="submit" disabled={fetcher.state !== "idle"}>
              {manual.submit}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

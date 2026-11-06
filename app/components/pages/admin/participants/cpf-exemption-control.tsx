import type { FC } from "react"
import { useFetcher } from "react-router"
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
import { adminParticipantsCopy } from "~/copy/admin/participants"

const copy = adminParticipantsCopy.cpfExemption

type CpfExemptionData = { success: boolean; errors?: { message: string }[] }

type CpfExemptionControlProps = {
  profileId: string
  cpfExempt: boolean
}

/**
 * Grants or lifts the CPF exemption. Granting asks first: it clears the CPF the
 * profile holds and rules out every online charge, neither of which the admin
 * should do by a slip. Lifting it only puts the CPF back on the person's list.
 */
export const CpfExemptionControl: FC<CpfExemptionControlProps> = ({
  profileId,
  cpfExempt,
}) => {
  const fetcher = useFetcher<CpfExemptionData>()
  const isSubmitting = fetcher.state !== "idle"
  const refusal =
    fetcher.state === "idle" && fetcher.data?.success === false
      ? (fetcher.data.errors?.[0]?.message ?? copy.failed)
      : null

  const submit = (value: boolean) =>
    fetcher.submit(
      {
        intent: "update-profile-cpf-exempt",
        profileId,
        cpfExempt: String(value),
      },
      { method: "POST" },
    )

  return (
    <div className="space-y-2">
      {cpfExempt ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded border border-yellow-500 bg-yellow-100 px-2 py-0.5 text-sm text-yellow-800">
            {copy.granted}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => submit(false)}
          >
            {copy.revoke}
          </Button>
        </div>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isSubmitting}>
              {copy.grant}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{copy.confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {copy.confirmDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={() => submit(true)}>
                {copy.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {refusal && (
        <p role="alert" className="text-sm text-red-600">
          {refusal}
        </p>
      )}
    </div>
  )
}

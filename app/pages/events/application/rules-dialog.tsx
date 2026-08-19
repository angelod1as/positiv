import { useState, type Dispatch, type FC, type SetStateAction } from "react"
import { useNavigation, useSubmit } from "react-router"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"

import { TextArea } from "~/components/ui/textarea"
import { rulesDialogCopy } from "~/copy/events"

type RulesDialogProps = {
  isDialogOpen: boolean
  setIsDialogOpen: Dispatch<SetStateAction<boolean>>
}

export const RulesDialog: FC<RulesDialogProps> = ({
  isDialogOpen,
  setIsDialogOpen,
}) => {
  const { state } = useNavigation()
  const isSubmitting = state === "submitting"
  const [notes, setNotes] = useState("")
  const submit = useSubmit()

  const handleSubmit = () => {
    submit(
      { confirmed: true, application_date: new Date().toISOString(), notes },
      {
        method: "POST",
      },
    )
  }

  return (
    <ConfirmDialog
      title={rulesDialogCopy.title}
      description={
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p>{rulesDialogCopy.notesPrompt}</p>
            <TextArea
              value={notes}
              onChange={(val) => setNotes(val.target.value)}
              placeholder={rulesDialogCopy.notesPlaceholder}
            />
          </div>
          <div>
            <p>{rulesDialogCopy.confirmation}</p>
            <p>{rulesDialogCopy.emailNotice}</p>
          </div>
        </div>
      }
      confirmLabel={rulesDialogCopy.confirmLabel}
      cancelLabel={rulesDialogCopy.cancelLabel}
      onConfirm={handleSubmit}
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      isLoading={isSubmitting}
    />
  )
}

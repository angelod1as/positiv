import { useState, type Dispatch, type FC, type SetStateAction } from "react"
import { useNavigation, useSubmit } from "react-router"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"

import { TextArea } from "~/components/ui/textarea"

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
      title="Confirmar inscrição"
      description={
        <div>
          <p>
            Você acertou tudo! Agora só falta clicar nesse botãozinho abaixo e
            confirmar sua inscrição.
          </p>
          <p>
            Você vai receber um email com os dados do evento, salve na sua
            agenda!
          </p>
          <TextArea
            value={notes}
            onChange={(val) => setNotes(val.target.value)}
          />
        </div>
      }
      confirmLabel="🎉 Confirmar!"
      cancelLabel="😢 Cancelar"
      onConfirm={handleSubmit}
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      isLoading={isSubmitting}
    />
  )
}

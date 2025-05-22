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
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p>
              Se você tiver alguma nota ou comentário que gostaria que as
              pessoas administradoras soubessem, escreva-as abaixo:
            </p>
            <TextArea
              value={notes}
              onChange={(val) => setNotes(val.target.value)}
              placeholder="O que quer que a gente saiba?"
            />
          </div>
          <div>
            <p>
              Você acertou tudo! Agora só falta clicar nesse botãozinho abaixo e
              confirmar sua inscrição.
            </p>
            <p>
              Você vai receber um email com os dados do evento, salve na sua
              agenda!
            </p>
          </div>
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

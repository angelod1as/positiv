import { useState } from "react"
import { useNavigation, useSubmit } from "react-router"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import type { FCC } from "~types/utils.types"
import type { Route } from "./+types/rules-page"
import { RulesForm } from "./rules/rules-form/rules-form"
import { RulesText } from "./rules/rules-text"

// Empty client-loader to force Client Side Rendering only
// otherwise the random form gives a hydration error
export async function clientLoader({}: Route.ClientLoaderArgs) {}

export async function action({ request, params }: Route.ActionArgs) {
  return await applyToEvent(request, params)
}

const Wrapper: FCC = ({ children }) => (
  <>
    <RulesText />

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="mt-4">✅ Hora do teste! ✅</h2>
        </CardTitle>
        <CardDescription>
          <p>(As questões e respostas são automaticamente embaralhadas)</p>
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  </>
)

export function HydrateFallback() {
  return (
    <Wrapper>
      <p>Carregando perguntas...</p>
    </Wrapper>
  )
}

const RulesPage = ({}: Route.ComponentProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const submit = useSubmit()
  const { state } = useNavigation()
  const isSubmitting = state === "submitting"

  const handleSubmit = () => {
    submit(
      { confirmed: true, application_date: new Date().toISOString() },
      {
        method: "POST",
      },
    )
  }

  return (
    <Wrapper>
      <RulesForm setIsDialogOpen={setIsDialogOpen} />
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
          </div>
        }
        confirmLabel="🎉 Confirmar!"
        cancelLabel="😢 Cancelar"
        onConfirm={handleSubmit}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isLoading={isSubmitting}
      />
    </Wrapper>
  )
}

export default RulesPage

import { redirect } from "react-router"
import { applyToEventSchema } from "~/business/common"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { rulesSessionStorage } from "~/business/session.server"
import { SchemaForm } from "~/components/forms/schema-form"
import paths from "~/lib/paths"
import type { Route } from "./+types/event-user-data"

const {
  dash: {
    events: { EVENT_RULES },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { getSession } = rulesSessionStorage
  const session = await getSession(request.headers.get("Cookie"))
  const isRulesCorrect = session.get("rulesCorrect")
  if (!isRulesCorrect) return redirect(EVENT_RULES(params.id))
}

export async function action({ request, params }: Route.ActionArgs) {
  return await applyToEvent(request, params)
}

const EventUserInfo = () => {
  return (
    <>
      <h1>Quase lá!</h1>
      <p>
        Parabéns, você acertou tudo! Essa é a última etapa: precisamos de
        algumas informações específicas à inscrição nesse evento.
      </p>
      <p>
        Ao clicar no botão "Confirmar Inscrição", sua inscrição será confirmada
        (óbvio) e você irá receber um email com os dados do evento, salve na sua
        agenda!
      </p>
      <p>(O email pode demorar uns minutos para chegar)</p>

      <SchemaForm
        schema={applyToEventSchema}
        hiddenFields={["applicationDate"]}
        values={{
          applicationDate: new Date(),
        }}
        multiline={["notes"]}
        labels={{
          notes:
            "Se você tiver alguma nota ou comentário que gostaria que as pessoas administradoras soubessem, escreva-as abaixo:",
        }}
        buttonLabel="🎉 Confirmar Inscrição!"
      />
    </>
  )
}

export default EventUserInfo

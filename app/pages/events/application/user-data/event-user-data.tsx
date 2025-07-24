import { redirect } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import { getUserContext } from "~/business/auth/auth.server"
import { applyToEventSchema } from "~/business/common"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { rulesSessionStorage } from "~/business/session.server"
import { SchemaForm } from "~/components/forms/base/schema-form"
import paths from "~/lib/paths"
import type { Route } from "./+types/event-user-data"

const {
  dash: {
    events: { EVENT_RULES },
    DASHBOARD,
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { getSession } = rulesSessionStorage
  const session = await getSession(request.headers.get("Cookie"))
  const isRulesCorrect = session.get("rulesCorrect")
  if (!isRulesCorrect) return redirect(EVENT_RULES(params.id))
}

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getUserContext(request, params)

  return formAction({
    request,
    schema: applyToEventSchema,
    mutation: applyToEvent,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(
          DASHBOARD,
          {
            message: "Inscrição efetuada com sucesso",
            description:
              "Você receberá as informações do evento em seu email (pode demorar uns minutos)",
            duration: 3000,
          },
          {
            headers: context.supabaseHeaders,
          },
        )
      }
      return result
    },
    context,
  })
}

const EventUserInfo = ({ params }: Route.ComponentProps) => {
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
        hiddenFields={["applicationDate", "eventId"]}
        radio={["bond"]}
        values={{
          applicationDate: new Date(),
          eventId: params.id,
        }}
        multiline={["notes", "companions", "referrals"]}
        labels={{
          notes:
            "Você tem alguma nota ou comentário que gostaria que as pessoas administradoras soubessem?",
          referrals: "Há alguma pessoa que você queira indicar? Por quê?",
          companions:
            "Você pretende ir acompanhade? Se sim, nos diga o nome completo da(s) pessoa(s).",
          bond: "Se a pessoa que você quer ir junte não for, você ainda assim quer ir no evento?",
        }}
        descriptions={{
          notes: "Você tem algum aviso, lembrete, ideia, ou sugestão?",
          referrals:
            "Diga os nomes completos daquelas pessoas que você acha que têm tudo a ver com a gente e que querem muito participar — não esqueça de escrever a razão.",
          companions:
            "Diga pra gente se você vai de galera — e quem é esse pessoal.",
          bond: "Se, pra você, tudo bem se você for selecionade e elas não, selecione a caixinha acima.",
        }}
        buttonLabel="🎉 Confirmar Inscrição!"
      />
    </>
  )
}

export default EventUserInfo

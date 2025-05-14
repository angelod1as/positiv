import { SirenIcon } from "lucide-react"
import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { agreeToTermsSchema } from "~/business/common"
import { agreeToTerms } from "~/business/participant/agree-to-terms.server"
import { SchemaForm } from "~/components/forms/schema-form"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import paths from "~/lib/paths"
import type { Route } from "./+types/agree-to-terms-page"

const {
  dash: {
    account: { BASIC_DATA },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)
  return { mktEmails: currentProfile?.allow_marketing_email }
}

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: agreeToTermsSchema,
    mutation: agreeToTerms,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(
          BASIC_DATA,
          "Escolhas salvas com sucesso",
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

const AgreeToTermsPage = ({ loaderData }: Route.ComponentProps) => {
  const { mktEmails } = loaderData
  return (
    <>
      <h1>Bem vinde à Positiv!</h1>

      <Alert variant="destructive">
        <SirenIcon className="h-4 w-4" />
        <AlertTitle>Tem que ler tudo!</AlertTitle>
        <AlertDescription>
          Se não puder gastar uns minutos lendo isso, já não é uma pessoa que
          passaria em nossa entrevista
        </AlertDescription>
      </Alert>

      <p>
        A Positiv é idealizada por Ju e Angelo para ser um local de segurança,
        acolhimento e pertencimento, onde pessoas de todas as identidades de
        gênero e orientações sexuais possam explorar seus corpos e sexualidade,
        se assim quiserem. É um evento apenas para gente maior de 18 anos,
        pensado, especificamente para pessoas não-monogâmicas e LGBTQIA+.
      </p>

      <p>
        "Ah, sou uma pessoa cis hétero e não mono, posso ir?" Existem muitos de
        espaços pensados para pessoas cis hétero e realmente queremos construir
        um coletivo que não seja cisheteronormativo. Portanto, se for uma pessoa
        cis hétero, as chances de você ser selecionade para participar são
        baixas. E, por favor, não minta sobre sua identidade ou orientação
        sexual.
      </p>

      <p>
        Costumamos dizer que nosso evento é, também, uma suruba, mas o foco
        principal não é o sexo. É um encontro entre amigos como outro qualquer,
        em que as pessoas podem estar peladas e fazer sexo, se todes envolvides
        consentirem. Não é necessário ficar pelade. Não é necessário transar. É
        um evento onde tudo o que for consentido pode acontecer, inclusive,
        nada.
      </p>

      <p>
        É importante você saber que realizamos a Positiv em uma suíte de motel
        de três andares (tem muita escada), perto da Raposo Tavares e ajudamos
        as pessoas com organização de caronas. Você também vai precisar levar um
        prato de comida para compartilhar com todes e também levar suas próprias
        bebidas ou comprar diretamente do motel.
      </p>

      <p>
        Se você sente que tem aderência com nossa proposta, saiba que, para ir à
        Positiv, é necessário:
      </p>
      <ol>
        <li>
          Preencher este formulário, inclusive responder às questões sobre
          nossas regras (que serão apresentadas a seguir)
        </li>

        <li>
          Se for selecionade, fazer uma pequena "entrevista" com um dos
          organizadores - Angelo ou Ju
        </li>
        <li>
          Se passar na entrevista, participar de um grupo de Whatsapp com todes
          es participantes da festa, que fica aberto durante uma semana antes da
          festa, para as pessoas criarem conexões e irem se conhecendo.
        </li>
      </ol>
      <p>
        Em qualquer um dos passos do processo, sua participação pode ser
        cancelada, caso sua conduta não corresponda com o que nós pregamos.
      </p>

      <SchemaForm
        schema={agreeToTermsSchema}
        values={{
          agree: false,
          commonEmails: true,
          mktEmails: mktEmails === undefined ? true : mktEmails,
        }}
        inputTypes={{
          agree: "checkbox",
          commonEmails: "checkbox",
          mktEmails: "checkbox",
        }}
        labels={{
          agree: "Li tudo e estou de acordo!",
          commonEmails: "Aceito receber e-mails gerais do sistema",
          mktEmails: "Aceito receber e-mails sobre a Positiv",
        }}
        descriptions={{
          commonEmails:
            "Vamos enviar mensagens sobre o processo de inscrição e, se você quiser, lembrete de datas importantes de eventos futuros (mas só se você clicar no botãozinho).",
          mktEmails:
            "Vamos enviar mensagens sobre outros eventos e parcerias, e também atualizações da Positiv que podem ir além das festas tradicionais .",
        }}
        buttonLabel="Continuar"
      >
        {({ Field, Errors, Button }) => (
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <Field name="agree" />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 my-4">
              <div className="flex-1">
                <Field name="commonEmails" />
              </div>
              <div className="flex-1">
                <Field name="mktEmails" />
              </div>
            </div>

            <Errors />

            <Button alignment="center" />
          </div>
        )}
      </SchemaForm>
    </>
  )
}

export default AgreeToTermsPage

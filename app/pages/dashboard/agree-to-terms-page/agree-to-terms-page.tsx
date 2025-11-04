import { SirenIcon } from "lucide-react"
import { formAction } from "remix-forms"
import { redirectWithSuccess, redirectWithWarning } from "remix-toast"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { agreeToTermsSchema } from "~/business/common"
import { agreeToTerms } from "~/business/participant/agree-to-terms.server"
import { getSubscriptionStatus } from "~/business/newsletter/subscription-helpers.server"
import { SchemaForm } from "~/components/forms/base/schema-form"
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

  // Get newsletter subscription status from the new table
  let mktEmails: boolean | undefined = undefined
  if (currentProfile) {
    const result = await getSubscriptionStatus(currentProfile.id)
    if (result.success && result.data) {
      mktEmails = result.data.consent_given
    }
  }

  return { mktEmails }
}

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: agreeToTermsSchema,
    mutation: agreeToTerms,
    transformResult: async (result) => {
      if (result.success) {
        const data = result.data as typeof context & { newsletterSubscriptionError?: string }

        if (data.newsletterSubscriptionError) {
          throw await redirectWithWarning(
            BASIC_DATA,
            {
              message: "Suas escolhas foram salvas, mas você não foi inscrito na newsletter. Por favor, entre em contato: partypositiv@gmail.com",
              duration: Infinity,
              closeButton: true,
            },
            {
              headers: context.supabaseHeaders,
            },
          )
        }

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
      <h2>O que é a Positiv?</h2>
      <p>
        A Positiv é idealizada por Ju e Angelo para ser um local de segurança,
        acolhimento e pertencimento, onde pessoas de todas as identidades de
        gênero e orientações sexuais possam explorar seus corpos e sexualidade,
        se assim quiserem. É um evento apenas para gente maior de 18 anos,
        pensado, especificamente para pessoas não-monogâmicas e LGBTQIA+.
      </p>
      <p>
        "Ah, sou uma pessoa cis hétero e não mono, posso ir?" Existem muitos
        espaços pensados para pessoas cis hétero e realmente queremos construir
        uma experiência coletiva que não seja cisheteronormativa. Portanto, se
        for uma pessoa cis hétero, as chances de você ser selecionade para
        participar são baixas. E, por favor, não minta sobre sua identidade ou
        orientação sexual.
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
      <h2>Próximos passos</h2>
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
        <b>
          Em qualquer um dos passos do processo, sua participação pode ser
          cancelada, caso sua conduta não corresponda com o que nós pregamos.
        </b>
      </p>

      <h2>Entradas sociais</h2>
      <p>
        Temos políticas de <b>entradas sociais</b> para pessoas trans, negras,
        indígenas e em vulnerabilidade social. Se você faz parte de um desses
        grupos e gostaria de participar da festa, se inscreva e avise na hora da
        entrevista.
      </p>
      <h2>Política de reembolso</h2>
      <p>
        Nossa política é simples: ao confirmarmos o número de participantes,
        pedimos o pagamento em até 15 dias antes do evento. Após o pagamento ser
        efetuado, seu lugar está garantido e você será adicionado no grupo do
        Whatsapp do evento.
      </p>
      <p>
        Se você precisar cancelar sua presença, temos regras específicas para
        reembolso:
      </p>

      <ul>
        <li>
          Mais que 5 dias antes do evento:
          <ul>
            <li>Devolvemos 50% do valor.</li>
            <li>Os 50% retidos servem como taxa de administração e sinal.</li>
          </ul>
        </li>
        <li>
          5 dias antes do evento:
          <ul>
            <li>Não há reembolso.</li>
          </ul>
        </li>
      </ul>

      <p>
        Lembrando que calculamos a data a partir do pedido de reembolso — não
        esqueça de nos contatar. Qualquer valor extra doado para vagas sociais
        não será reembolsado, afinal, ele pode já ter sido usado.
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

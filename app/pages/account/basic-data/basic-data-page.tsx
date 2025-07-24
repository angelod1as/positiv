import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { basicDataSchema } from "~/business/common"
import { basicData } from "~/business/participant/basic-data.server"
import { SchemaForm } from "~/components/forms/base/schema-form"
import paths from "~/lib/paths"
import type { Route } from "./+types/basic-data-page"

const {
  dash: {
    account: { GENDER_PRONOUNS_ORIENTATION },
  },
} = paths

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: basicDataSchema,
    mutation: basicData,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(GENDER_PRONOUNS_ORIENTATION, {
          message: "Dados salvos com sucesso!",
        })
      }
      return result
    },
    context,
  })
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile: profile } = await getUserContext(request, params)
  return { profile }
}

const BasicDataPage = ({ loaderData }: Route.ComponentProps) => {
  const { profile } = loaderData || {}

  const defaultValues = {
    ...(profile || {}),
    ...(profile?.phone
      ? {
          confirm_phone: profile.phone,
        }
      : {}),
  }

  return (
    <>
      <div>
        <h1>Dados básicos</h1>
        <p className="text-muted-foreground">
          {profile?.basic_data_filled
            ? "Atualize seus dados"
            : "Precisamos destes dados básicos para nosso controle interno de pessoas participantes"}
        </p>
      </div>
      <SchemaForm
        schema={basicDataSchema}
        values={defaultValues}
        labels={{
          full_name: "Nome completo",
          social_name: "Nome social ou apelido",
          date_of_birth: "Data de nascimento",
          where_lives: "Em que cidade você mora?",
          how_came_to_us: "Como chegou até nós?",
          phone: "Whatsapp",
          confirm_phone: "Confirme seu whatsapp",
          cpf: "CPF",
          rg: "RG",
          rg_issuer: "Emissor do RG",
        }}
        inputTypes={{
          confirm_phone: "textnumber",
          phone: "textnumber",
          date_of_birth: "date",
        }}
        descriptions={{
          social_name: "Como você quer ser chamade?",
          where_lives: "Nossa dúvida: de onde nosso público vêm?",
          how_came_to_us:
            "Nos diga o nome de quem te indicou ou se você nos viu em alguma rede social",
          phone: "Só números, com DDD. Ex: 11955552222",
          confirm_phone: "Só números, com DDD. Ex: 11955552222",
          rg_issuer: "Exemplo: SSP/SP",
        }}
      >
        {({ Field, Button, Errors }) => {
          return (
            <div>
              <div className="flex flex-col gap-6 sm:grid grid-cols-12 sm:gap-4">
                <Field name="full_name" className="col-span-5" />
                <Field name="social_name" className="col-span-4" />
                <Field name="date_of_birth" className="col-span-3" />
                <Field name="where_lives" className="col-span-6" />
                <Field name="how_came_to_us" className="col-span-6" />
                <Field name="phone" className="col-span-6" />
                <Field name="confirm_phone" className="col-span-6" />
                <p className="col-span-12 mt-4 text-muted-foreground text-sm">
                  Os dados abaixo serão utilizados para controle de entrada nos
                  locais dos eventos:
                </p>
                <Field name="cpf" className="col-span-4" />
                <Field name="rg" className="col-span-4" />
                <Field name="rg_issuer" className="col-span-4" />
              </div>
              <Errors />
              <Button />
            </div>
          )
        }}
      </SchemaForm>
    </>
  )
}

export default BasicDataPage

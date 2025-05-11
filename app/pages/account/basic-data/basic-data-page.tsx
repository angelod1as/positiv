import { formAction } from "remix-forms"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { basicDataSchema } from "~/business/common"
import { basicData } from "~/business/participant/basic-data.server"
import { SchemaForm } from "~/components/forms/schema-form"
import paths from "~/lib/paths"
import type { Route } from "./+types/basic-data-page"

const {
  dash: {
    DASHBOARD,
    account: { ACCOUNT },
  },
} = paths

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getContext(request, params)
  const isEdit = !!context.currentProfile

  return formAction({
    request,
    schema: basicDataSchema,
    mutation: basicData,
    successPath: isEdit ? ACCOUNT : DASHBOARD,
    context,
  })
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile: profile } = await getUserContext(request, params)
  return { profile }
}

// TODO: Finish with custom checkbox
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
          // pronouns: "Pronomes",
          // orientation: "Orientação",
          // gender: "Gênero",
        }}
        // TODO: Missing
        // options={{
        //   gender: [
        //     "Mulher cis",
        //     "Mulher trans",
        //     "Travesti",
        //     "Pessoa não binária",
        //     "Pessoa agênera",
        //     "Homem trans",
        //     "Homem cis",
        //   ].map(toOptions),
        //   orientation: [
        //     "Hétero",
        //     "Gay",
        //     "Sapatão",
        //     "Bi",
        //     "Pan",
        //     "Demi",
        //     "Ace",
        //   ].map(toOptions),
        //   pronouns: ["Ele/dele", "Ela/dela", "Elu/delu", "Ile/dile"].map(
        //     toOptions,
        //   ),
        // }}
        inputTypes={{
          confirm_phone: "textnumber",
          phone: "textnumber",
          date_of_birth: "date",
          // TODO: Should be checkbox with other, no text-input
          // gender: "checkbox-with-other",
          // orientation: "checkbox-with-other",
          // pronouns: "checkbox-with-other",
        }}
        descriptions={{
          social_name: "Como você quer ser chamade?",
          where_lives: "Nossa dúvida: de onde nosso público vêm?",
          how_came_to_us: "Qual rede social? Que pessoa indicou?",
          phone: "Só números, com DDD. Ex: 11955552222",
          confirm_phone: "Só números, com DDD. Ex: 11955552222",
          rg_issuer: "Exemplo: SSP/SP",
          // pronouns: "Pode escolher mais de um",
          // gender: "Pode escolher mais de um",
          // orientation: "Pode escolher mais de um",
        }}
      />
    </>
  )
}

export default BasicDataPage

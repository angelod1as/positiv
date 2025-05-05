import { applySchema } from "composable-functions"
import { redirect } from "react-router"
import { formAction } from "remix-forms"
import { z, type ZodTypeAny } from "zod"
import { getUserContext } from "~/business/auth.server"
import { SchemaForm } from "~/components/forms/schema-form"
import paths from "~/lib/paths"
import type { ProfileWithRoles } from "~types/entities.types"
import type { DBClient } from "~types/utils.types"
import type { Route } from "./+types/basic-data-page"

const {
  auth: { LOGIN },
  dash: {
    DASHBOARD,
    account: { ACCOUNT },
  },
} = paths

type ZObject = Omit<
  Record<keyof ProfileWithRoles | "confirm_phone", ZodTypeAny>,
  | "id"
  | "basic_data_filled"
  | "email"
  | "created_at"
  | "allow_marketing_email"
  | "is_admin"
  | "roles"
  // TODO: Missing: gender, orientation, pronouns
  | "gender"
  | "orientation"
  | "pronouns"
>

// const oneCheckMessage = "Escolha pelo menos um"

const zObject: ZObject = {
  full_name: z.string().min(2).max(255),
  social_name: z.string().min(2).max(255).optional(),
  rg: z.string().min(2),
  rg_issuer: z.string().min(2),
  cpf: z.string().min(2),
  date_of_birth: z.coerce.date(),
  phone: z.coerce.number({
    invalid_type_error: "Você tem certeza que digitou um número?",
  }),
  confirm_phone: z.coerce.number({
    invalid_type_error: "Você tem certeza que digitou um número?",
  }),
  how_came_to_us: z.string().optional(),
  where_lives: z.string().optional(),

  // TODO: Missing: gender, orientation, pronouns
  // gender: z.array(z.string()).refine((value) => value.some((item) => item), {
  //   message: oneCheckMessage,
  // }),
  // orientation: z
  //   .array(z.string())
  //   .refine((value) => value.some((item) => item), {
  //     message: oneCheckMessage,
  //   }),
  // pronouns: z.array(z.string()).refine((value) => value.some((item) => item), {
  //   message: oneCheckMessage,
  // }),
}

export const schema = z
  .object(zObject)
  .refine((data) => data.phone === data.confirm_phone, {
    message: "Os números de telefone são diferentes",
    path: ["phone"],
  })

const contextSchema = z.custom<{ supabase: DBClient }>()

const mutation = applySchema(
  schema,
  contextSchema,
)(async (values, context) => {
  const { supabase } = context
  const {
    error: authError,
    data: { user },
  } = await supabase.auth.getUser()

  if (authError || !user) {
    const { code, message } = authError || {}
    throw new Error(
      `Erro buscando o usuário — Código: "${code}" — Mensagem: "${message}"`,
    )
  }

  const {
    confirm_phone,
    // gender, orientation, pronouns, // TODO: Missing
    ...data
  } = values

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      ...data,
      // TODO: Missing
      // gender: gender.filter(Boolean),
      // orientation: orientation.filter(Boolean),
      // pronouns: pronouns.filter(Boolean),
      basic_data_filled: true,
    })
    .eq("user_id", user.id)
    .single()

  if (updateError) {
    const { code, message } = updateError || {}
    throw new Error(
      `Erro atualizando o usuário — Código: "${code}" — Mensagem: "${message}"`,
    )
  }

  // QUESTION: Return undefined === success?
  return
})

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getUserContext(request, params)
  const isEdit = !!context.currentProfile

  return formAction({
    request,
    schema,
    mutation,
    successPath: isEdit ? ACCOUNT : DASHBOARD,
    context,
  })
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile: profile, supabaseHeaders } = await getUserContext(
    request,
    params,
  )
  if (!profile) {
    throw redirect(LOGIN, { headers: supabaseHeaders })
  }
  return { profile }
}

// const toOptions = (term: string) => ({
//   name: term,
//   value: slugify(term, { lower: true, replacement: "/" }),
// })

// TODO: Finish with custom checkbox
const BasicDataPage = ({ loaderData }: Route.ComponentProps) => {
  const { profile } = loaderData || {}

  if (!profile)
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
          schema={schema}
          values={profile}
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

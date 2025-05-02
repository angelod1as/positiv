import { applySchema } from "composable-functions"
import { formAction } from "remix-forms"
import { z, type ZodTypeAny } from "zod"
import { SchemaForm } from "~/components/forms/schema-form"
import paths from "~/lib/paths"
import { getCurrentProfile } from "~/lib/supabase/fetch/get-current-profile"
import { createClient } from "~/lib/supabase/server"
import type { ProfileWithRoles } from "~types/entities.types"
import type { DBClient } from "~types/utils.types"
import type { Route } from "./+types/basic-data-page"

const {
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
>

const oneCheckMessage = "Escolha pelo menos um"

const zObject: ZObject = {
  full_name: z.string().min(2).max(255),
  social_name: z.string().min(2).max(255).optional(),
  rg: z.string().min(2),
  rg_issuer: z.string().min(2),
  cpf: z.string().min(2),
  date_of_birth: z.coerce.date(),
  gender: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: oneCheckMessage,
  }),
  orientation: z
    .array(z.string())
    .refine((value) => value.some((item) => item), {
      message: oneCheckMessage,
    }),
  pronouns: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: oneCheckMessage,
  }),
  phone: z.coerce.number({
    invalid_type_error: "Você tem certeza que digitou um número?",
  }),
  confirm_phone: z.coerce.number({
    invalid_type_error: "Você tem certeza que digitou um número?",
  }),
  how_came_to_us: z.string().optional(),
  where_lives: z.string().optional(),
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

  const { confirm_phone, gender, orientation, pronouns, ...data } = values

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      ...data,
      gender: gender.filter(Boolean),
      orientation: orientation.filter(Boolean),
      pronouns: pronouns.filter(Boolean),
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

export async function action({ request }: Route.ActionArgs) {
  const { supabase } = createClient(request)
  const profile = await getCurrentProfile(supabase)
  const isEdit = !!profile

  return formAction({
    request,
    schema,
    mutation,
    successPath: isEdit ? ACCOUNT : DASHBOARD,
    context: { supabase },
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createClient(request)
  const profile = await getCurrentProfile(supabase)
  return { profile }
}

// TODO: Finish with custom checkbox
const BasicDataPage = ({ loaderData }: Route.ComponentProps) => {
  const { profile } = loaderData || {}
  // const genders = [
  //   "Mulher cis",
  //   "Mulher trans",
  //   "Travesti",
  //   "Pessoa não binária",
  //   "Pessoa agênera",
  //   "Homem trans",
  //   "Homem cis",
  // ]

  // const orientations = ["Hétero", "Gay", "Sapatão", "Bi", "Pan", "Demi", "Ace"]

  // const pronouns = ["Ele/dele", "Ela/dela", "Elu/delu", "Ile/dile"]
  return (
    <>
      <SchemaForm
        schema={schema}
        // Descriptions??
        // Custom Pronouns, Orientation, Gender
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
          pronouns: "Pronomes",
          orientation: "Orientação",
          gender: "Gênero",
        }}
        inputTypes={{
          confirm_phone: "number",
          phone: "number",
          date_of_birth: "date",
        }}
      />
    </>
  )
}

export default BasicDataPage

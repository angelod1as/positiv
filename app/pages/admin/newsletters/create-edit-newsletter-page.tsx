import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Form, useSubmit } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import type { z } from "zod"
import {
  createOrUpdateNewsletter,
  getAdminContext,
  getNewsletterById,
} from "~/business/admin/admin.server"
import { newsletterFormSchema } from "~/business/admin/common"
import { FormError } from "~/components/forms/form-error"
import { Select } from "~/components/forms/select"
import MdxEditor from "~/components/organisms/mdx-editor/mdx-editor"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import paths from "~/lib/paths"
import type { Route } from "./+types/create-edit-newsletter-page"

const {
  admin: {
    newsletters: { ADMIN_VIEW_NEWSLETTER },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)
  const newsletterId = params.id
  if (!newsletterId) return { newsletter: undefined }

  const result = await getNewsletterById(newsletterId)
  if (!result.success) {
    throw new Error("Newsletter não encontrada")
  }
  return { newsletter: result.data }
}

export async function action({ request, params }: Route.ActionArgs) {
  return formAction({
    request,
    schema: newsletterFormSchema,
    mutation: createOrUpdateNewsletter,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(
          ADMIN_VIEW_NEWSLETTER(result.data),
          `Newsletter ${params.id ? "atualizada" : "criada"} com sucesso`,
        )
      }
      return result
    },
  })
}

type FormData = z.infer<typeof newsletterFormSchema>
const options = [
  { value: "all_participants", label: "Todes inscrites" },
  { value: "past_participants", label: "Veteranes" },
]

const AdminCreateEditNewsletterPage = ({
  loaderData,
}: Route.ComponentProps) => {
  const { newsletter } = loaderData
  const submit = useSubmit()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(newsletterFormSchema),
    defaultValues: newsletter || {
      content: "",
      audience: "all_participants",
      subject: "",
    },
  })

  const onSubmit = (val: FormData) =>
    submit(val, {
      method: "POST",
    })

  return (
    <>
      {newsletter ? <h1>Editar newsletter</h1> : <h1>Criar nova newsletter</h1>}

      <Form
        method="post"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="subject">Assunto</Label>
          <Controller
            name="subject"
            control={control}
            rules={{ required: "O assunto é obrigatório" }}
            render={({ field }) => <Input {...field} />}
          />
          {errors.subject && <FormError>{errors.subject.message}</FormError>}
        </div>

        <div>
          <Label htmlFor="audience">Público</Label>
          <Controller
            name="audience"
            control={control}
            render={({ field }) => (
              <Select {...field}>
                {options.map(({ label, value }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          />
          {errors.audience && <FormError>{errors.audience.message}</FormError>}
        </div>

        <div>
          <Label htmlFor="content">Conteúdo</Label>
          <Controller
            name="content"
            control={control}
            rules={{
              required: "O conteúdo é obrigatório",
              minLength: {
                value: 10,
                message: "O conteúdo precisa ter ao menos 10 caracteres",
              },
            }}
            render={({ field: { onChange, value } }) => (
              <MdxEditor
                id={newsletter?.id}
                value={value}
                onChange={onChange}
              />
            )}
          />
          {errors.content && <FormError>{errors.content.message}</FormError>}
        </div>

        <Button>Salvar</Button>
      </Form>
    </>
  )
}

export default AdminCreateEditNewsletterPage

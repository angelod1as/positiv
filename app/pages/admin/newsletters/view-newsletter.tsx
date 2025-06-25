import { Form, useSubmit } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import {
  getAdminContext,
  getNewsletterById,
  sendNewsletter,
} from "~/business/admin/admin.server"
import { sendNewsletterSchema } from "~/business/admin/common"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-newsletter"

const {
  admin: {
    newsletters: { ADMIN_NEWSLETTERS },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)
  const id = params.id
  if (!id) {
    throw await redirectWithError(
      ADMIN_NEWSLETTERS,
      "Newsletter não encontrada",
    )
  }
  const result = await getNewsletterById(id)
  if (!result.success) {
    throw await redirectWithError(
      ADMIN_NEWSLETTERS,
      "Newsletter não encontrada",
    )
  }
  return { newsletter: result.data }
}

export async function action({ request, params }: Route.ActionArgs) {
  return await formAction({
    request,
    schema: sendNewsletterSchema,
    mutation: sendNewsletter,
    // transformResult: async (result) => {
    //   if (result.success) {
    //     throw await redirectWithSuccess(
    //       ADMIN_NEWSLETTERS,
    //       "Newsletter enviada com sucesso",
    //     )
    //   }
    //   return result
    // },
  })
}

const AdminViewNewsletter = ({ loaderData }: Route.ComponentProps) => {
  const submit = useSubmit()
  const { newsletter } = loaderData

  return (
    <>
      <h1>{newsletter.subject}</h1>
      <p className="text-sm text-muted-foreground">
        Criada em: {formatDateTime(newsletter.created_at).full}
        {newsletter.sent_at && (
          <> | Enviada em: {formatDateTime(newsletter.sent_at).full}</>
        )}
      </p>
      <div className="whitespace-pre-wrap p-4 border rounded">
        {newsletter.content}
      </div>
      {newsletter.status !== "sent" && (
        <Form method="post">
          <ConfirmDialog
            title="Enviar newsletter?"
            description={
              <p>Deseja enviar esta newsletter para todos os destinatários?</p>
            }
            confirmLabel="Enviar"
            cancelLabel="Cancelar"
            onConfirm={(close) => {
              submit(newsletter, { method: "post" })
              close()
            }}
          >
            <ConfirmDialog.Trigger>Enviar newsletter</ConfirmDialog.Trigger>
          </ConfirmDialog>
        </Form>
      )}
    </>
  )
}

export default AdminViewNewsletter

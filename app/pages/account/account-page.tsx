import { Separator } from "@radix-ui/react-separator"
import { Form } from "react-router"
import { getClientContext, logoutUser } from "~/business/auth/auth.client"
import { getUserContext } from "~/business/auth/auth.server"
import { Button } from "~/components/atoms/button/button"
import { Link } from "~/components/atoms/link/link"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import paths from "~/lib/paths"
import type { Route } from "./+types/account-page"

const {
  dash: {
    account: { CHANGE_PASSWORD, BASIC_DATA },
    participant: { AGREE_TO_TERMS },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)
  return { basic_data_filled: currentProfile?.basic_data_filled }
}

export async function clientAction({}: Route.ClientActionArgs) {
  const context = await getClientContext()
  await logoutUser(context)
}

/* TODO: Implement account deletion
It needs, in this order:
- remove sensitive data from the profile
- remove the Auth user
*/

const AccountPage = ({ loaderData }: Route.ComponentProps) => {
  const { basic_data_filled } = loaderData

  return (
    <>
      <h1>Gerenciar conta</h1>

      <div className="flex flex-col gap-12 h-full">
        <div className="flex flex-col gap-4">
          <Button variant="outline" to={CHANGE_PASSWORD}>
            Mudar senha
          </Button>
          <Button
            variant="outline"
            to={basic_data_filled ? BASIC_DATA : AGREE_TO_TERMS}
          >
            {basic_data_filled
              ? "Editar dados básicos"
              : "Preencher dados básicos"}
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <Separator />
          <Form method="POST" className="w-full">
            <Button variant="outline" className="w-full">
              Deslogar conta
            </Button>
          </Form>

          <ConfirmDialog
            title="Apagar conta"
            description={
              <div>
                <p>
                  Esta funcionalidade está em implementação. Entre em contato
                  conosco para deletar sua conta, através do email{" "}
                  <Link to="mailto:contato@positivparty.com">
                    contato@positivparty.com
                  </Link>
                </p>
              </div>
            }
            cancelLabel="Entendi"
          >
            <ConfirmDialog.Trigger variant="destructive">
              Apagar conta
            </ConfirmDialog.Trigger>
          </ConfirmDialog>
        </div>
      </div>
    </>
  )
}

export default AccountPage

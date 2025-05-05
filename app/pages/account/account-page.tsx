import { Separator } from "@radix-ui/react-separator"
import { Form, redirect } from "react-router"
import { formAction } from "remix-forms"
import { getUserContext } from "~/business/auth.server"
import { logoutSchema, logoutUser } from "~/business/auth/logout.server"
import { Button } from "~/components/atoms/button/button"
import { Link } from "~/components/atoms/link/link"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import paths from "~/lib/paths"
import type { Route } from "./+types/account-page"

const {
  auth: { LOGIN },
  dash: {
    account: {
      RESET_PASSWORD,
      basicData: { EDIT },
    },
    participant: { AGREE_TO_TERMS },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)
  return { basic_data_filled: currentProfile?.basic_data_filled }
}

// TODO: Not working.
export async function action({ request, params }: Route.ActionArgs) {
  const context = await getUserContext(request, params)

  return formAction({
    request,
    schema: logoutSchema,
    mutation: logoutUser,
    transformResult: (result) => {
      if (result.success) {
        throw redirect(LOGIN, { headers: context.supabaseHeaders })
      }
      return result
    },
    context,
  })
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
          <Button variant="outline" to={RESET_PASSWORD}>
            Mudar senha
          </Button>
          <Button
            variant="outline"
            to={basic_data_filled ? EDIT : AGREE_TO_TERMS}
          >
            Editar dados básicos
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
            trigger={{ label: "Apagar conta", variant: "destructive" }}
            dialog={{
              title: "Apagar conta",
              description: (
                <div>
                  <p>
                    Esta funcionalidade está em implementação. Entre em contato
                    conosco para deletar sua conta, através do email{" "}
                    <Link to="mailto:contato@positivparty.com">
                      contato@positivparty.com
                    </Link>
                  </p>
                  {/* <p>Você tem certeza que quer apagar sua conta?</p>
                  <p>
                    <b>Esta ação é IRREVERSÍVEL.</b>
                  </p> */}
                </div>
              ),
            }}
            cancel={{ label: "Cancelar", variant: "outline" }}
            // confirm={{
            //   label: "Deletar",
            //   variant: "destructive",
            //   targetFn: handleDelete,
            // }}
          />
        </div>
      </div>
    </>
  )
}

export default AccountPage

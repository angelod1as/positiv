import { Separator } from "@radix-ui/react-separator"
import { Form } from "react-router"
import {
  getContext,
  getUserContext,
  logoutUser,
} from "~/business/auth/auth.server"
import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { accountCopy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import { POSITIV_EMAIL } from "~/lib/constants/constants"
import paths from "~/lib/paths"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/account-page"

const {
  root: { CODE_OF_CONDUCT },
  dash: {
    account: { CHANGE_PASSWORD, BASIC_DATA },
    participant: { AGREE_TO_TERMS },
  },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.account.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)
  return { basic_data_filled: currentProfile?.basic_data_filled }
}

export async function action({ params, request }: Route.ActionArgs) {
  const context = await getContext(request, params)
  return await logoutUser(context)
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
      <h1>{accountCopy.title}</h1>

      <div className="flex flex-col gap-12 h-full">
        <div className="flex flex-col gap-4">
          <Button variant="outline" to={CHANGE_PASSWORD}>
            {accountCopy.changePassword}
          </Button>
          {basic_data_filled ? (
            <>
              <Button variant="outline" to={BASIC_DATA}>
                {accountCopy.editBasicData}
              </Button>
              <Button variant="outline" to={AGREE_TO_TERMS}>
                {accountCopy.terms}
              </Button>
            </>
          ) : (
            <Button variant="outline" to={AGREE_TO_TERMS}>
              {accountCopy.fillBasicData}
            </Button>
          )}
          <Button variant="outline" to={CODE_OF_CONDUCT}>
            {accountCopy.codeOfConduct}
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <Separator />
          <Form method="POST" className="w-full">
            <Button variant="outline" className="w-full">
              {accountCopy.logout}
            </Button>
          </Form>

          <ConfirmDialog
            title={accountCopy.deleteAccount.title}
            description={
              <Copy>{accountCopy.deleteAccount.description(POSITIV_EMAIL)}</Copy>
            }
            cancelLabel={accountCopy.deleteAccount.cancelLabel}
          >
            <ConfirmDialog.Trigger variant="destructive">
              {accountCopy.deleteAccount.trigger}
            </ConfirmDialog.Trigger>
          </ConfirmDialog>
        </div>
      </div>
    </>
  )
}

export default AccountPage

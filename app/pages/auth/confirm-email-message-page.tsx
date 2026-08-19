import { Copy } from "~/components/atoms/copy/copy"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"

import { Button } from "~/components/atoms/button/button"
import { confirmEmailMessageCopy } from "~/copy/auth"
import { metaCopy } from "~/copy/meta"
import { sharedCopy } from "~/copy/shared"
import paths from "~/lib/paths"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/confirm-email-message-page"

const {
  root: { HOME },
  auth: { FORGOT_PASSWORD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.confirmEmailMessage.title)
}

const ConfirmEmailMessagePage = ({}: Route.ComponentProps) => {
  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">
          {confirmEmailMessageCopy.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p>{confirmEmailMessageCopy.instruction}</p>
        <p className="text-sm">{confirmEmailMessageCopy.spamNotice}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-6">
        <Button to={HOME}>{sharedCopy.actions.backHome}</Button>
        <p className="text-sm">
          <Copy inline>{confirmEmailMessageCopy.retry(FORGOT_PASSWORD)}</Copy>
        </p>
      </CardFooter>
    </Card>
  )
}

export default ConfirmEmailMessagePage

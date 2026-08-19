import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { accountReadyCopy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/account-ready-page"

const {
  dash: { DASHBOARD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.accountReady.title)
}

const AccountReadyPage = ({}: Route.ComponentProps) => {
  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>{accountReadyCopy.title}</h1>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Copy>{accountReadyCopy.body}</Copy>
      </CardContent>

      <CardFooter>
        <Button to={DASHBOARD}>{accountReadyCopy.cta}</Button>
      </CardFooter>
    </Card>
  )
}

export default AccountReadyPage

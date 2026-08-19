import { Fragment } from "react"
import { getContext } from "~/business/auth/auth.server"
import { Copy } from "~/components/atoms/copy/copy"
import { metaCopy } from "~/copy/meta"
import { publicCopy } from "~/copy/public"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "../public/+types/code-of-conduct"

const { codeOfConduct } = publicCopy

export async function loader({ params, request }: Route.LoaderArgs) {
  const { currentUser } = await getContext(request, params)
  const isLoggedIn = !!currentUser?.id

  return {
    isLoggedIn,
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    ...createMetaArray(metaCopy.codeOfConduct.title),
    {
      name: "description",
      content: metaCopy.codeOfConduct.description,
    },
    {
      property: "og:description",
      content: metaCopy.codeOfConduct.description,
    },
  ]
}

export default function CodeOfConduct() {
  return (
    <>
      <h1>{codeOfConduct.title}</h1>

      <Copy>{codeOfConduct.intro}</Copy>

      {codeOfConduct.sections.map((section) => (
        <Fragment key={section.heading}>
          <h2>{section.heading}</h2>
          <Copy>{section.body}</Copy>
        </Fragment>
      ))}
    </>
  )
}

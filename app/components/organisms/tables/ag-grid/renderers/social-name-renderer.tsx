import type { ICellRendererParams } from "ag-grid-community"

interface SocialNameData {
  social_name?: string | null
  full_name: string
}

export function SocialNameRenderer(
  params: ICellRendererParams<SocialNameData>
) {
  const socialName = params.value as string | null | undefined
  const fullName = params.data?.full_name ?? ""

  if (socialName) {
    return <>{socialName}</>
  }

  const firstName = fullName.split(" ")[0]

  if (!firstName) {
    return <>-</>
  }

  return <i>{firstName}</i>
}

import type { ICellRendererParams } from "ag-grid-community"
import { Link } from "~/components/atoms/link/link"
import paths from "~/lib/paths"

const {
  admin: { ADMIN_VIEW_PARTICIPANT },
} = paths

interface SocialNameData {
  id?: string
  social_name?: string | null
  full_name: string
}

export function SocialNameRenderer(
  params: ICellRendererParams<SocialNameData>,
) {
  const { data } = params
  if (!data) {
    return <>-</>
  }

  const { id: profileId, social_name: socialName, full_name: fullName } = data

  let content: React.ReactNode

  if (socialName) {
    content = <>{socialName}</>
  } else {
    const firstName = fullName?.trim().split(/\s+/)[0]
    content = firstName ? <i>{firstName}</i> : <>-</>
  }

  if (profileId) {
    return <Link to={ADMIN_VIEW_PARTICIPANT(profileId)}>{content}</Link>
  }

  return content
}

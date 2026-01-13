import type { ICellRendererParams } from "ag-grid-community"
import { Link } from "~/components/atoms/link/link"
import paths from "~/lib/paths"

const {
  admin: {
    ADMIN_VIEW_PARTICIPANT,
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

interface SocialNameData {
  id?: string
  profile_id?: string
  social_name?: string | null
  full_name: string
}

interface SocialNameContext {
  eventId?: string
}

export function SocialNameRenderer(
  params: ICellRendererParams<SocialNameData>,
) {
  const { data, context } = params
  const ctx = context as SocialNameContext | undefined

  if (!data) {
    return <>-</>
  }

  const { social_name: socialName, full_name: fullName } = data

  let content: React.ReactNode

  if (socialName) {
    content = <>{socialName}</>
  } else {
    const firstName = fullName?.trim().split(/\s+/)[0]
    content = firstName ? <i>{firstName}</i> : <>-</>
  }

  // When in event context, use event-participant route with profile_id
  if (ctx?.eventId && data.profile_id) {
    return (
      <Link to={ADMIN_EVENT_VIEW_PARTICIPANT(ctx.eventId, data.profile_id)}>
        {content}
      </Link>
    )
  }

  // Profile-only mode: use id directly (it's the profile id)
  if (data.id && !ctx?.eventId) {
    return <Link to={ADMIN_VIEW_PARTICIPANT(data.id)}>{content}</Link>
  }

  return content
}

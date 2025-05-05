import { HomeIcon, UserIcon } from "lucide-react"
import type { FC } from "react"
import PositivLogo from "~/assets/brand/positiv-logo-colors.png"
import { Button } from "~/components/atoms/button/button"
import { Link } from "~/components/atoms/link/link"
import paths from "~/lib/paths"
import type { ProfileWithRoles } from "~types/entities.types"
import type { NullablePartial } from "~types/utils.types"

const {
  root: { HOME },
  auth: { LOGIN },
  dash: {
    DASHBOARD,
    account: { ACCOUNT },
  },
} = paths

type HeaderProps = {
  profile: Pick<
    NullablePartial<ProfileWithRoles>,
    "social_name" | "full_name" | "email"
  > | null
}

export const Header: FC<HeaderProps> = ({ profile }) => {
  const displayName = profile
    ? profile.social_name || profile.full_name || profile.email
    : undefined

  return (
    <header className="flex items-center justify-between p-4 sticky top-0 left-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 px-[1.75rem]">
      <div className="text-xl font-bold">
        <Link variant="unstyled" to={HOME}>
          <img
            alt="Logo Positiv"
            src={PositivLogo}
            className="w-auto px-2 py-1 rounded-lg max-h-8"
          />
        </Link>
      </div>
      <div className="flex items-center space-x-2">
        {profile ? (
          <div className="flex items-center space-x-2">
            {!!displayName && <p>Olá, {displayName}</p>}
            <Button asChild variant="outline" title="Dashboard" to={DASHBOARD}>
              <HomeIcon />
            </Button>
            <Button asChild variant="outline" title="Conta" to={ACCOUNT}>
              <UserIcon />
            </Button>
          </div>
        ) : (
          <Button to={LOGIN}>Login</Button>
        )}
      </div>
    </header>
  )
}

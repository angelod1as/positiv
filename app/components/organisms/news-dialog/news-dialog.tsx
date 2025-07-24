import { BellDotIcon } from "lucide-react"
import { useFetcher } from "react-router"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { NEWS_VERSION } from "~/lib/helpers/constants"
import type { ProfileWithRoles } from "~types/entities.types"
import { News } from "./news"
import { hasVisibleNews, DEFAULT_NEWS_ITEMS } from "./news-utils"

export const NewsDialog = ({
  isThereAnyNews,
  isHeader,
  currentProfile,
}: {
  isThereAnyNews: boolean
  isHeader?: boolean
  currentProfile?: ProfileWithRoles | null
}) => {
  const fetcher = useFetcher()
  const isAdmin = currentProfile?.is_admin ?? false
  
  // Check if user has any news they can actually see
  const userHasVisibleNews = hasVisibleNews(isAdmin, DEFAULT_NEWS_ITEMS)
  const shouldShowBell = isThereAnyNews && userHasVisibleNews

  const handleConfirm = (closeDialog: () => void) => {
    closeDialog()
    fetcher.submit(
      {
        newsVersion: NEWS_VERSION.toString(),
        intent: "news-update",
        thisUrl: window.location.href,
      },
      { method: "POST" },
    )
  }

  return (
    <ConfirmDialog
      description={<News isAdmin={isAdmin} />}
      title="News"
      onConfirm={handleConfirm}
      confirmLabel="Não mostrar isso novamente"
    >
      {isHeader ? (
        shouldShowBell && (
          <ConfirmDialog.Trigger variant="ghost">
            <BellDotIcon />
          </ConfirmDialog.Trigger>
        )
      ) : (
        <ConfirmDialog.Trigger className="text-xs" variant="link">
          Veja as novidades do site
        </ConfirmDialog.Trigger>
      )}
    </ConfirmDialog>
  )
}

import { BellDotIcon } from "lucide-react"
import { useFetcher } from "react-router"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { useNewsStatus } from "~/lib/hooks/use-news-status"
import type { ProfileWithRoles } from "~types/database/entities.types"
import { News } from "./news"
import { DEFAULT_NEWS_ITEMS, hasVisibleNews, NEWS_VERSION } from "./news-utils"

export const NewsDialog = ({
  isHeader,
  currentProfile,
}: {
  isHeader?: boolean
  currentProfile?: ProfileWithRoles | null
}) => {
  const fetcher = useFetcher()
  const isAdmin = currentProfile?.is_admin ?? false
  const isThereAnyNews = useNewsStatus()

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

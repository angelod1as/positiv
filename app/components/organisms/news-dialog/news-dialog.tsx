import { BellDotIcon } from "lucide-react"
import { useFetcher } from "react-router"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { NEWS_VERSION } from "~/lib/helpers/constants"
import { News } from "./news"

export const NewsDialog = ({
  isThereAnyNews,
  isHeader,
}: {
  isThereAnyNews: boolean
  isHeader?: boolean
}) => {
  const fetcher = useFetcher()

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
      description={<News />}
      title="News"
      onConfirm={handleConfirm}
      confirmLabel="Não mostrar isso novamente"
    >
      {isHeader ? (
        isThereAnyNews && (
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

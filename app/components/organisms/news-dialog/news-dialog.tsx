import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { NEWS_VERSION } from "~/lib/helpers/constants"
import { News } from "./news"

export const NewsDialog = ({ showNews }: { showNews: boolean | null }) => {
  const fetcher = useFetcher()

  const [isOpen, setIsOpen] = useState(showNews)

  useEffect(() => {
    setIsOpen(showNews)
  }, [showNews])

  const handleConfirm = (closeDialog: () => void) => {
    closeDialog()
    fetcher.submit({ newsVersion: NEWS_VERSION.toString() }, { method: "POST" })
  }

  return (
    <ConfirmDialog
      open={isOpen ?? true}
      onOpenChange={setIsOpen}
      description={<News />}
      title="News"
      onConfirm={handleConfirm}
      confirmLabel="Não mostrar isso novamente"
    >
      <ConfirmDialog.Trigger variant="ghost">
        Veja as novidades
      </ConfirmDialog.Trigger>
    </ConfirmDialog>
  )
}

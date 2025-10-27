import { EyeIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"

type TextViewModalCellProps = {
  value: string | null | undefined
  label?: string
}

const TRUNCATE_LENGTH = 25

export const TextViewModalCell = ({ value, label }: TextViewModalCellProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const text = value || ""
  const shouldTruncate = text.length > TRUNCATE_LENGTH

  if (!shouldTruncate) {
    return <div>{text}</div>
  }

  const truncatedText = text.slice(0, TRUNCATE_LENGTH) + "..."

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span>{truncatedText}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          aria-label="View full text"
        >
          <EyeIcon className="size-4" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{label || "View Text"}</DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap">{text}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}

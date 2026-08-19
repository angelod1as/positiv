import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import { newsletterModalCopy } from "~/copy/newsletter"
import { sharedCopy } from "~/copy/shared"

interface NewsletterSubscriptionModalProps {
  open: boolean
}

export function NewsletterSubscriptionModal({
  open,
}: NewsletterSubscriptionModalProps) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem("newsletter-modal-dismissed")
    setIsVisible(open && dismissed !== "true")
  }, [open])

  const handleSubscribe = () => {
    fetcher.submit(
      {
        intent: "newsletter-subscribe",
        thisUrl: window.location.href,
      },
      { method: "POST" },
    )
  }

  const handleDismiss = () => {
    sessionStorage.setItem("newsletter-modal-dismissed", "true")
    setIsVisible(false)
  }

  return (
    <AlertDialog open={isVisible}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{newsletterModalCopy.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <Copy>{newsletterModalCopy.body}</Copy>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isSubmitting}
          >
            {newsletterModalCopy.dismiss}
          </Button>
          <Button
            variant="default"
            onClick={handleSubscribe}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? sharedCopy.status.loading
              : newsletterModalCopy.subscribe}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

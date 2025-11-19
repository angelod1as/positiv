import { useEffect, useState } from "react"
import { useFetcher, useLocation } from "react-router"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/atoms/button/button"
import { useNewsletterStatus } from "~/lib/hooks/use-newsletter-status"
import { useRootData } from "~/lib/hooks/use-root-data"

export function NewsletterSubscriptionModal() {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"
  const [isVisible, setIsVisible] = useState(false)
  const { currentProfile } = useRootData()
  const shouldShowNewsletterModal = useNewsletterStatus(currentProfile)
  const location = useLocation()

  const authFlowPaths = [
    "/entrar",
    "/registrar",
    "/conta/dados-basicos",
    "/conta/dados-basicos-cont",
    "/conta/termos-e-condicoes",
  ]
  const isAuthFlow = authFlowPaths.some((path) =>
    location.pathname.startsWith(path),
  )
  const open = shouldShowNewsletterModal && !isAuthFlow

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
          <AlertDialogTitle>Cadastre-se na nossa newsletter!</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Receba atualizações sobre os próximos eventos, novidades e
                conteúdos exclusivos da Positiv diretamente no seu email.
              </p>
              <p>
                Você pode cancelar sua inscrição a qualquer momento, e suas
                informações nunca serão compartilhadas com terceiros.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isSubmitting}
          >
            Talvez mais tarde
          </Button>
          <Button
            variant="default"
            onClick={handleSubscribe}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Carregando..." : "Inscrever-me"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

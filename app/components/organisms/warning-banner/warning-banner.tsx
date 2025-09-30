"use client"

import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"

const STORAGE_KEY = "warning-banner-dismissed"

const WARNING_MESSAGE = (
  <>
    ⚠️ Nosso processo de login pode estar com problemas. Se tiver dificuldades,
    contate-nos em{" "}
    <a
      href="mailto:contato@positivparty.com"
      className="underline hover:text-red-800"
    >
      contato@positivparty.com
    </a>
  </>
)

export function WarningBanner() {
  const [isDismissed, setIsDismissed] = useState(true)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    setIsDismissed(dismissed === "true")
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setIsDismissed(true)
  }

  if (isDismissed) {
    return null
  }

  return (
    <div className="w-full bg-red-50 border-b-2 border-red-600">
      <Alert
        variant="destructive"
        className="rounded-none border-0 bg-transparent text-red-700 py-3 px-4"
      >
        <AlertDescription className="flex items-center justify-between gap-4 col-span-2">
          <span className="font-medium text-sm sm:text-base">
            {WARNING_MESSAGE}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-6 w-6 flex-shrink-0 text-red-700 hover:bg-red-100 hover:text-red-800"
            aria-label="Dismiss warning"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}

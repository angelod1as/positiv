"use client"

import { X } from "lucide-react"
import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"

const STORAGE_KEY = "warning-banner-dismissed"

export function WarningBanner() {
  const [isDismissed, setIsDismissed] = useState(true)
  const bannerMessage = import.meta.env.VITE_BANNER_MESSAGE

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    setIsDismissed(dismissed === "true")
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setIsDismissed(true)
  }

  if (!bannerMessage || isDismissed) {
    return null
  }

  return (
    <div className="w-full bg-red-50 border-b-2 border-red-600">
      <Alert
        variant="destructive"
        className="rounded-none border-0 bg-transparent text-red-700 py-3 px-4"
      >
        <AlertDescription className="flex items-center justify-between gap-4 col-span-2">
          <div className="font-medium text-sm sm:text-base prose prose-sm prose-red max-w-none [&_a]:underline [&_a:hover]:text-red-800">
            <ReactMarkdown>{bannerMessage}</ReactMarkdown>
          </div>
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

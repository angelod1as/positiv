import { X } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Copy } from "~/components/atoms/copy/copy"
import { RichText } from "~/components/atoms/rich-text/rich-text"
import type { PortableText } from "~/business/cms/content.schema"
import { noticeCopy } from "~/copy/layout"
import { Button } from "~/components/ui/button"

const STORAGE_KEY = "notice-dismissed"

type NoticeProps = {
  notice: PortableText | null
  editorialSystemUnavailable: boolean
}

function hashOf(notice: PortableText) {
  const text = JSON.stringify(notice)
  let hash = 5381
  for (let index = 0; index < text.length; index++) {
    hash = (hash * 33) ^ text.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}

function readDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeDismissed(hash: string) {
  try {
    localStorage.setItem(STORAGE_KEY, hash)
  } catch {
    // The Notice still closes for this page view.
  }
}

export function Notice({ notice, editorialSystemUnavailable }: NoticeProps) {
  const [dismissedHash, setDismissedHash] = useState<string | null>(null)
  const [hasReadStorage, setHasReadStorage] = useState(false)
  const hash = notice ? hashOf(notice) : null

  useEffect(() => {
    setDismissedHash(readDismissed())
    setHasReadStorage(true)
  }, [])

  const handleDismiss = () => {
    if (!hash) return
    writeDismissed(hash)
    setDismissedHash(hash)
  }

  if (editorialSystemUnavailable) {
    return (
      <NoticeFrame>
        <Copy>{noticeCopy.editorialSystemUnavailable}</Copy>
      </NoticeFrame>
    )
  }

  if (!notice || !hasReadStorage || dismissedHash === hash) {
    return null
  }

  return (
    <NoticeFrame onDismiss={handleDismiss}>
      <RichText value={notice} />
    </NoticeFrame>
  )
}

type NoticeFrameProps = {
  children: ReactNode
  onDismiss?: () => void
}

function NoticeFrame({ children, onDismiss }: NoticeFrameProps) {
  return (
    <div className="w-full bg-red-50 border-b-2 border-red-600">
      <Alert
        variant="destructive"
        className="rounded-none border-0 bg-transparent text-red-700 py-3 px-4"
      >
        <AlertDescription className="flex items-center justify-between gap-4 col-span-2">
          <div className="font-medium text-sm sm:text-base [&_a]:underline [&_a:hover]:text-red-800">
            {children}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-6 w-6 flex-shrink-0 text-red-700 hover:bg-red-100 hover:text-red-800"
              aria-label={noticeCopy.dismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}

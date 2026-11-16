import { useEffect, useState } from "react"
import { Button } from "~/components/atoms/button/button"
import { analyticsOptOutCopy } from "~/copy/privacy"

const OPT_OUT_KEY = "umami.disabled"

type AnalyticsOptOutProps = {
  reload?: () => void
}

// The recorder already running on this page ignores the flag, so the page is
// reloaded: the loader then leaves the recorder out and the tracker stays quiet.
export const AnalyticsOptOut = ({
  reload = () => window.location.reload(),
}: AnalyticsOptOutProps) => {
  const [optedOut, setOptedOut] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)

  useEffect(() => {
    try {
      setOptedOut(window.localStorage.getItem(OPT_OUT_KEY) !== null)
    } catch {
      setOptedOut(false)
    }
  }, [])

  const toggle = () => {
    try {
      if (optedOut) window.localStorage.removeItem(OPT_OUT_KEY)
      else window.localStorage.setItem(OPT_OUT_KEY, "1")
    } catch {
      setStorageFailed(true)
      return
    }
    reload()
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {optedOut && <p>{analyticsOptOutCopy.optedOut}</p>}
      {storageFailed && (
        <p role="alert">{analyticsOptOutCopy.storageFailed}</p>
      )}
      <Button variant="outline" onClick={toggle}>
        {optedOut ? analyticsOptOutCopy.optIn : analyticsOptOutCopy.optOut}
      </Button>
    </div>
  )
}

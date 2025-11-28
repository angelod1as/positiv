import { useEffect, useState } from "react"
import type { PrefetchBehavior } from "react-router"

type ConnectionType = "slow-2g" | "2g" | "3g" | "4g" | "unknown"

interface NetworkInformation extends EventTarget {
  effectiveType?: ConnectionType
  saveData?: boolean
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

export function useSmartPrefetch(): PrefetchBehavior {
  const [prefetchStrategy, setPrefetchStrategy] =
    useState<PrefetchBehavior>("intent")

  useEffect(() => {
    const nav = navigator as NavigatorWithConnection
    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection

    if (!connection) {
      setPrefetchStrategy("intent")
      return
    }

    const updateStrategy = () => {
      const effectiveType = connection.effectiveType || "unknown"
      const saveData = connection.saveData || false

      if (saveData) {
        setPrefetchStrategy("none")
        if (import.meta.env.DEV) {
          console.log("[Prefetch] Data saver mode enabled, prefetch disabled")
        }
        return
      }

      if (effectiveType === "slow-2g" || effectiveType === "2g") {
        setPrefetchStrategy("none")
        if (import.meta.env.DEV) {
          console.log(
            `[Prefetch] Slow connection detected (${effectiveType}), prefetch disabled`,
          )
        }
      } else if (effectiveType === "3g") {
        setPrefetchStrategy("intent")
        if (import.meta.env.DEV) {
          console.log(
            `[Prefetch] Moderate connection (${effectiveType}), using intent prefetch`,
          )
        }
      } else {
        setPrefetchStrategy("intent")
        if (import.meta.env.DEV) {
          console.log(
            `[Prefetch] Fast connection (${effectiveType}), using intent prefetch`,
          )
        }
      }
    }

    updateStrategy()

    connection.addEventListener("change", updateStrategy)

    return () => {
      connection.removeEventListener("change", updateStrategy)
    }
  }, [])

  return prefetchStrategy
}

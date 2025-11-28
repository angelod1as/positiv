import { useEffect, useState } from "react"

type PrefetchBehavior = "intent" | "render" | "none" | "viewport"
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
    useState<PrefetchBehavior>("none")

  useEffect(() => {
    const nav = navigator as NavigatorWithConnection
    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection

    if (!connection) {
      if (import.meta.env.DEV) {
        console.info(
          "[Prefetch] Network Information API not supported, prefetch disabled for safety",
        )
      }
      return
    }

    const updateStrategy = () => {
      const effectiveType = connection.effectiveType || "unknown"
      const saveData = connection.saveData || false

      if (saveData) {
        setPrefetchStrategy("none")
        if (import.meta.env.DEV) {
          console.info("[Prefetch] Data saver mode enabled, prefetch disabled")
        }
        return
      }

      if (effectiveType === "slow-2g" || effectiveType === "2g") {
        setPrefetchStrategy("none")
        if (import.meta.env.DEV) {
          console.info(
            `[Prefetch] Slow connection detected (${effectiveType}), prefetch disabled`,
          )
        }
      } else if (effectiveType === "3g") {
        setPrefetchStrategy("intent")
        if (import.meta.env.DEV) {
          console.info(
            `[Prefetch] Moderate connection (${effectiveType}), using intent prefetch`,
          )
        }
      } else {
        setPrefetchStrategy("intent")
        if (import.meta.env.DEV) {
          console.info(
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

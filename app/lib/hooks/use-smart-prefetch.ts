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
      return
    }

    const updateStrategy = () => {
      const effectiveType = connection.effectiveType || "unknown"
      const saveData = connection.saveData || false

      if (saveData) {
        setPrefetchStrategy("none")
        return
      }

      if (effectiveType === "slow-2g" || effectiveType === "2g") {
        setPrefetchStrategy("none")
      } else {
        setPrefetchStrategy("intent")
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

import { useEffect, useState, type ReactNode } from "react"
import type { FCC } from "~types/utils/utils.types"

//
// S

/**
 * Hides a component for n delay time while rendering it.
 *
 * This component exists because of some components' inability to load properly (namely, Primereact DataTable), and that messes up E2E.
 */
const DelayedContent: FCC<{
  delay?: number
  loadingComponent?: ReactNode
}> = ({ children, delay = 500, loadingComponent }) => {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  const defaultLoadingComponent = (
    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg z-10">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      <p className="ml-4 text-gray-700">Carregando...</p>
    </div>
  )

  return (
    <div className="relative">
      {!showContent && (loadingComponent ?? defaultLoadingComponent)}
      <div
        className={`${showContent ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {children}
      </div>
    </div>
  )
}

export default DelayedContent

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

export const useLocalStorageDraft = (id: string) => {
  const [loadedContent, setLoadedContent] = useState<string | undefined>(
    undefined,
  )
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false)

  const draftKey = `mdx_draft_${id}`

  const saveContent = useCallback(
    (content: string) => {
      try {
        const draftData = {
          content: content,
          updatedAt: Date.now(),
        }
        localStorage.setItem(draftKey, JSON.stringify(draftData))
        toast.success(`Draft saved successfully to localStorage: ${draftKey}`)
      } catch (e) {
        toast.error(`Error saving draft to localStorage: ${e} `)
      }
    },
    [draftKey],
  )

  useEffect(() => {
    if (initialLoadAttempted) return

    try {
      const storedDraft = localStorage.getItem(draftKey)

      if (storedDraft) {
        const draftData = JSON.parse(storedDraft)
        const savedContent = draftData.content
        const updatedAt = draftData.updatedAt

        const twoDaysInMs = 2 * 24 * 60 * 60 * 1000
        const twoDaysAgo = Date.now() - twoDaysInMs

        if (updatedAt < twoDaysAgo) {
          localStorage.removeItem(draftKey)
          setLoadedContent(undefined)
        } else {
          setLoadedContent(savedContent)
          toast.success(`Draft loaded from localStorage: ${draftKey}`)
        }
      } else {
        setLoadedContent(undefined)
      }
    } catch (e) {
      console.error("Error loading or parsing draft from localStorage: ", e)
      setLoadedContent(undefined)
    } finally {
      setInitialLoadAttempted(true)
    }
  }, [id, initialLoadAttempted, draftKey])

  return { loadedContent, saveContent }
}

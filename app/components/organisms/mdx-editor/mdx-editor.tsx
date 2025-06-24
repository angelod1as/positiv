import { MDXEditor, type MDXEditorMethods } from "@mdxeditor/editor"
import "@mdxeditor/editor/style.css"
import { useEffect, useRef, useState } from "react"

import { toast } from "sonner"
import { FormError } from "~/components/forms/form-error"
import { useDebounceFunction } from "~/hooks/use-debounce" // Your debounce hook
import { formatTimeAgo } from "./format-time-ago"
import { useLocalStorageDraft } from "./hooks/use-local-storage-draft"
import { mdxEditorPlugins } from "./mdx-editor-plugins"

type MdxEditorProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  errors?: string[]
}

export default function MdxEditor({
  id = "no-id",
  value,
  onChange,
  errors,
}: MdxEditorProps) {
  const [mounted, setMounted] = useState(false)
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(
    null,
  )
  const [displayStatusMessage, setDisplayStatusMessage] = useState<string>(
    "Aguardando interação...",
  )
  const [editorMarkdown, setEditorMarkdown] = useState(value)

  const editorRef = useRef<MDXEditorMethods>(null)
  const hasLoadedInitialContentRef = useRef(false)

  const { loadedContent, saveContent } = useLocalStorageDraft(id)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Syncs editor markdown with parent
  useEffect(() => {
    if (value !== editorMarkdown) {
      setEditorMarkdown(value)
    }
  }, [value])

  // Loads initial content
  useEffect(() => {
    if (
      !mounted ||
      loadedContent === undefined ||
      hasLoadedInitialContentRef.current
    ) {
      return
    }

    if (loadedContent !== null) {
      if (loadedContent !== value && loadedContent !== editorMarkdown) {
        editorRef.current?.setMarkdown(loadedContent)
        setEditorMarkdown(loadedContent)
        onChange(loadedContent)
        setLastSavedTimestamp(null)
        toast.success("Conteúdo do rascunho carregado com sucesso!")
      }
    }

    hasLoadedInitialContentRef.current = true
  }, [mounted, loadedContent, value, editorMarkdown, onChange])

  const [debouncedOnChangeAndSave, debounceStatus] = useDebounceFunction(
    (newValue: string) => {
      onChange(newValue)
      saveContent(newValue)
      setLastSavedTimestamp(Date.now())
    },
    1500,
  )

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined

    const updateDisplay = () => {
      if (debounceStatus === "waiting") {
        setDisplayStatusMessage("Pare de digitar para salvar...")
      } else if (debounceStatus === "running") {
        setDisplayStatusMessage("Salvando...")
      } else {
        // debounceStatus is "idle"
        setDisplayStatusMessage(formatTimeAgo(lastSavedTimestamp))
      }
    }

    updateDisplay()

    if (debounceStatus === "idle" && lastSavedTimestamp !== null) {
      intervalId = setInterval(updateDisplay, 5000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [debounceStatus, lastSavedTimestamp])

  if (!mounted) {
    return <div>Carregando editor...</div>
  }

  const handleChange = (newValue: string) => {
    setEditorMarkdown(newValue)
    debouncedOnChangeAndSave(newValue)
  }

  return (
    <div>
      <div className="border rounded">
        <MDXEditor
          ref={editorRef}
          markdown={editorMarkdown}
          onChange={handleChange}
          contentEditableClassName="prose max-w-full font-sans min-h-[400px]"
          plugins={mdxEditorPlugins(editorMarkdown)}
        />
      </div>
      {errors && <FormError>{errors}</FormError>}
      <p className="text-xs mt-0">**Status:** {displayStatusMessage}</p>
    </div>
  )
}

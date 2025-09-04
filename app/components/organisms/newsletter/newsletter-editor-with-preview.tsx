import { useState, useEffect, useRef } from 'react'
import { useDebounceFunction } from '~/lib/hooks/use-debounce'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { cn } from '~/lib/utils'

interface NewsletterEditorWithPreviewProps {
  value: string
  onChange: (value: string) => void
  templateName: string
  placeholder?: string
  className?: string
}

interface PreviewError {
  message: string
  line: number | null
}

export function NewsletterEditorWithPreview({
  value,
  onChange,
  templateName,
  placeholder,
  className
}: NewsletterEditorWithPreviewProps) {
  const [preview, setPreview] = useState<string>('')
  const [error, setError] = useState<PreviewError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const fetchPreview = async (content: string, template: string) => {
    // Don't fetch if content is empty
    if (!content.trim()) {
      setPreview('')
      setError(null)
      return
    }
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/newsletters/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_mdx: content,
          template_name: template
        }),
        signal: abortControllerRef.current.signal
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPreview(data.html)
        setError(null)
      } else {
        setError(data.error)
        setPreview('')
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      
      setError({
        message: 'Failed to generate preview. Please try again.',
        line: null
      })
      setPreview('')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Create debounced version of fetchPreview
  const debouncedFetchPreview = useDebounceFunction(fetchPreview, 500)
  
  // Fetch preview when content or template changes
  useEffect(() => {
    debouncedFetchPreview(value, templateName)
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [value, templateName])
  
  return (
    <div className={cn("grid lg:grid-cols-2 gap-4", className)}>
      {/* Editor Panel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Editor</label>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating preview...
            </div>
          )}
        </div>
        
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[500px] p-4 font-mono text-sm border rounded-md resize-y"
          spellCheck={false}
        />
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>MDX Error</AlertTitle>
            <AlertDescription>
              {error.line && <span className="font-semibold">Line {error.line}: </span>}
              {error.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* Preview Panel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Preview</label>
          {preview && !isLoading && (
            <span className="text-sm text-green-600">Live preview</span>
          )}
        </div>
        
        <div className="border rounded-md overflow-hidden bg-gray-50 min-h-[500px]">
          {!value.trim() ? (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              <p>Start typing to see preview</p>
            </div>
          ) : isLoading && !preview ? (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[500px] p-8">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Fix the error to see preview
                </p>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={preview}
              className="w-full h-[500px] bg-white"
              title="Newsletter Preview"
              sandbox="allow-same-origin"
            />
          )}
        </div>
      </div>
    </div>
  )
}
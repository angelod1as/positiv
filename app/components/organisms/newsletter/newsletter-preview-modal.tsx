import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

interface NewsletterPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  subject: string
  contentMdx: string
  templateName: string
}

export function NewsletterPreviewModal({
  isOpen,
  onClose,
  subject,
  contentMdx,
  templateName
}: NewsletterPreviewModalProps) {
  const [preview, setPreview] = useState<string>('')
  const [error, setError] = useState<{ message: string; line: number | null } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    if (!isOpen || !contentMdx) return
    
    const fetchPreview = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/admin/newsletters/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content_mdx: contentMdx,
            template_name: templateName
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          setPreview(data.html)
        } else {
          setError(data.error)
        }
      } catch {
        setError({
          message: 'Failed to generate preview. Please try again.',
          line: null
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPreview()
  }, [isOpen, contentMdx, templateName])
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Preview: {subject}</DialogTitle>
          <DialogDescription>
            This is how your newsletter will appear to recipients
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>MDX Error</AlertTitle>
                <AlertDescription>
                  {error.line && <span className="font-semibold">Line {error.line}: </span>}
                  {error.message}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Fix the MDX errors in the newsletter content to see the preview.
              </p>
            </div>
          ) : preview ? (
            <iframe
              srcDoc={preview}
              className="w-full h-full bg-white rounded border"
              title="Newsletter Preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No content to preview
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
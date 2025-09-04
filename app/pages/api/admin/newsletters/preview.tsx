import { getAdminContext } from '~/business/admin/admin.server'
import { processMDXContent } from '~/business/admin/newsletter/mdx-processor.server'
import { formatNewsletterMail, type NewsletterTemplate } from '~/business/email/format-newsletter-mail'

interface ActionArgs {
  request: Request
  params: Record<string, string | undefined>
}

export async function action({ request, params }: ActionArgs) {
  // Verify admin access
  await getAdminContext(request, params)
  
  try {
    const formData = await request.json()
    const { content_mdx, template_name } = formData
    
    if (!content_mdx || typeof content_mdx !== 'string') {
      return Response.json({ 
        success: false, 
        error: { 
          message: 'MDX content is required',
          line: null 
        } 
      }, { status: 400 })
    }
    
    if (!template_name || !['general-news', 'event-announcement'].includes(template_name)) {
      return Response.json({ 
        success: false, 
        error: { 
          message: 'Valid template name is required',
          line: null 
        } 
      }, { status: 400 })
    }
    
    try {
      // Process MDX to HTML
      const { html: mdxHtml } = await processMDXContent(content_mdx)
      
      // Wrap in email template
      const { html } = await formatNewsletterMail({
        subject: 'Preview',
        content: mdxHtml,
        template: template_name as NewsletterTemplate,
        unsubscribeUrl: '#'
      })
      
      return Response.json({ success: true, html })
    } catch (mdxError) {
      // Parse error for line number
      const error = mdxError instanceof Error ? mdxError.message : String(mdxError)
      const lineMatch = error.match(/line (\d+)|Line (\d+)|at position \((\d+):/)
      const line = lineMatch 
        ? parseInt(lineMatch[1] || lineMatch[2] || lineMatch[3]) 
        : null
      
      // Clean up error message for user
      let message = error
      
      // Handle common MDX errors
      if (error.includes('Could not parse')) {
        message = 'Invalid MDX syntax: ' + error.replace(/^.*?Could not parse[^\n]*\n?/, '')
      } else if (error.includes('to be defined')) {
        // Component not found error
        const componentMatch = error.match(/`(\w+)` to be defined/)
        if (componentMatch) {
          message = `Unknown component: ${componentMatch[1]}. Available components: EventCard, Button, Divider, Quote`
        } else {
          message = error // Keep original if we can't parse it
        }
      } else if (error.includes('Expected component')) {
        // Alternative format for component not found
        const componentMatch = error.match(/Expected component `(\w+)`/)
        if (componentMatch) {
          message = `Unknown component: ${componentMatch[1]}. Available components: EventCard, Button, Divider, Quote`
        } else {
          message = error
        }
      } else if (error.includes('Expected')) {
        // Extract the useful part of the error
        const expectedMatch = error.match(/Expected (.+?)(?:\n|$)/)
        if (expectedMatch) {
          message = `MDX Error: Expected ${expectedMatch[1]}`
        }
      } else if (error.includes('not allowed')) {
        message = error // Security errors should be shown as-is
      }
      
      return Response.json({ 
        success: false, 
        error: { 
          message, 
          line 
        } 
      })
    }
  } catch (error) {
    console.error('Newsletter preview error:', error)
    return Response.json({ 
      success: false, 
      error: { 
        message: 'An unexpected error occurred while generating preview',
        line: null 
      } 
    }, { status: 500 })
  }
}

// Only allow POST requests
export async function loader() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}
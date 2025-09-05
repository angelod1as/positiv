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
          message: 'Conteúdo MDX é obrigatório',
          line: null 
        } 
      }, { status: 400 })
    }
    
    if (!template_name || !['general-news', 'event-announcement'].includes(template_name)) {
      return Response.json({ 
        success: false, 
        error: { 
          message: 'Template válido é obrigatório',
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
      // Log the full error for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('MDX compilation error:', mdxError)
      }
      
      // Parse error for line number
      const error = mdxError instanceof Error ? mdxError.message : String(mdxError)
      
      // Try multiple patterns for line number extraction
      let line: number | null = null
      const linePatterns = [
        /line (\d+)/i,
        /Line (\d+)/,
        /at position \((\d+):/,
        /:(\d+):\d+/,  // Common format like file.mdx:15:3
        /\((\d+):(\d+)\)/  // Alternative format (15:3)
      ]
      
      for (const pattern of linePatterns) {
        const match = error.match(pattern)
        if (match && match[1]) {
          const parsedLine = parseInt(match[1])
          if (!isNaN(parsedLine)) {
            line = parsedLine
            break
          }
        }
      }
      
      // Clean up error message for user
      let message = error
      
      // Handle common MDX errors with safer parsing
      try {
        if (error.includes('Could not parse')) {
          const cleanMessage = error.split('Could not parse')[1]
          if (cleanMessage) {
            message = 'Sintaxe MDX inválida:' + cleanMessage.split('\n')[0]
          } else {
            message = 'Sintaxe MDX inválida no seu conteúdo'
          }
        } else if (error.includes('to be defined') || error.includes('Expected component')) {
          // Component not found error - try multiple patterns
          const componentPatterns = [
            /`(\w+)` to be defined/,
            /Expected component `(\w+)`/,
            /Unknown component: (\w+)/
          ]
          
          let componentName: string | null = null
          for (const pattern of componentPatterns) {
            const match = error.match(pattern)
            if (match && match[1]) {
              componentName = match[1]
              break
            }
          }
          
          if (componentName) {
            message = `Componente desconhecido: ${componentName}. Componentes disponíveis: EventCard, Button, Divider, Quote`
          } else {
            message = 'Componente desconhecido usado no conteúdo. Componentes disponíveis: EventCard, Button, Divider, Quote'
          }
        } else if (error.includes('Expected')) {
          // Extract the useful part of the error
          const expectedMatch = error.match(/Expected (.+?)(?:\n|$)/)
          if (expectedMatch && expectedMatch[1]) {
            message = `Erro MDX: Esperado ${expectedMatch[1].trim()}`
          } else {
            message = 'Erro de sintaxe MDX no seu conteúdo'
          }
        } else if (error.includes('not allowed')) {
          // Security errors - translate them
          if (error.includes('JavaScript expressions')) {
            message = 'Expressões JavaScript não são permitidas no conteúdo MDX por razões de segurança'
          } else {
            message = 'Conteúdo não permitido por razões de segurança'
          }
        }
      } catch {
        // If any parsing fails, use a safe fallback
        message = 'Erro ao processar MDX. Por favor, verifique a sintaxe do seu conteúdo.'
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
    if (process.env.NODE_ENV === 'development') {
      console.error('Newsletter preview error:', error)
    }
    return Response.json({ 
      success: false, 
      error: { 
        message: 'Ocorreu um erro inesperado ao gerar o preview',
        line: null 
      } 
    }, { status: 500 })
  }
}

// Only allow POST requests
export async function loader() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}
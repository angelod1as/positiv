import { compile } from "@mdx-js/mdx"
import * as runtime from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { convert, type HtmlToTextOptions, type FormatCallback } from "html-to-text"
import React from "react"

// Custom email components
const EmailEventCard = ({ title, date, location, spots }: {
  title: string
  date: string
  location: string
  spots: number
}) => {
  return React.createElement('div', { 
    className: 'event-card',
    style: { 
      border: '1px solid #e5e5e5', 
      borderRadius: '8px', 
      padding: '16px', 
      marginBottom: '16px',
      backgroundColor: '#f9f9f9'
    }
  }, [
    React.createElement('h3', { key: 'title', style: { marginTop: 0 } }, `🎉 ${title}`),
    React.createElement('p', { key: 'date' }, [
      React.createElement('strong', { key: 'date-label' }, 'Data: '),
      date
    ]),
    React.createElement('p', { key: 'location' }, [
      React.createElement('strong', { key: 'location-label' }, 'Local: '),
      location
    ]),
    React.createElement('p', { key: 'spots' }, [
      React.createElement('strong', { key: 'spots-label' }, 'Vagas: '),
      `${spots} pessoas`
    ])
  ])
}

const EmailButton = ({ href, children }: {
  href: string
  children: React.ReactNode
}) => {
  return React.createElement('a', { 
    href,
    className: 'button',
    style: {
      display: 'inline-block',
      padding: '12px 24px',
      backgroundColor: '#8b5cf6',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '6px',
      fontWeight: 'bold',
      marginTop: '8px',
      marginBottom: '8px'
    }
  }, children)
}

const EmailDivider = () => {
  return React.createElement('hr', { 
    style: { 
      borderTop: '1px solid #e5e5e5',
      marginTop: '24px',
      marginBottom: '24px'
    } 
  })
}

const EmailQuote = ({ author, children }: {
  author?: string
  children: React.ReactNode
}) => {
  return React.createElement('blockquote', {
    style: {
      borderLeft: '4px solid #8b5cf6',
      paddingLeft: '16px',
      marginLeft: 0,
      fontStyle: 'italic',
      color: '#666'
    }
  }, [
    React.createElement('p', { key: 'quote' }, children),
    author && React.createElement('p', { key: 'author', style: { marginTop: '8px' } }, `- ${author}`)
  ])
}

// Component mapping for MDX
const components = {
  EventCard: EmailEventCard,
  Button: EmailButton,
  Divider: EmailDivider,
  Quote: EmailQuote,
}

interface ProcessMDXResult {
  html: string
  text: string
}

export async function processMDXContent(
  mdxContent: string,
  _templateName: 'event-announcement' | 'general-news'
): Promise<ProcessMDXResult> {
  try {
    // Compile MDX to JavaScript
    const compiled = await compile(mdxContent, {
      outputFormat: 'function-body',
      development: false,
    })

    // Create a function from the compiled code
    const code = String(compiled)
    
    // Create the MDX function
    const mdxFunction = new Function('_jsx_runtime', code)
    
    // Run the MDX function to get React elements
    const mdxExport = mdxFunction(runtime)
    const MDXContent = mdxExport.default

    // Render the MDX content with custom components
    const element = React.createElement(MDXContent, { components })
    
    // Convert React elements to HTML string
    const html = renderToStaticMarkup(element)

    // Convert HTML to plain text for fallback
    const blockquoteFormatter: FormatCallback = (elem, walk, builder) => {
      walk(elem.children || [], builder)
    }
    
    const horizontalLine: FormatCallback = (_elem, _walk, builder) => {
      builder.addInline('\n---\n')
    }
    
    const textOptions: HtmlToTextOptions = {
      wordwrap: 130,
      selectors: [
        { selector: 'a', options: { baseUrl: 'https://positiv.com' } },
        { selector: 'hr', format: 'horizontalLine' },
        { selector: 'blockquote', format: 'blockquoteFormatter' },
        { selector: 'h1', options: { uppercase: false } },
        { selector: 'h2', options: { uppercase: false } },
        { selector: 'h3', options: { uppercase: false } },
        { selector: 'h4', options: { uppercase: false } },
        { selector: 'h5', options: { uppercase: false } },
        { selector: 'h6', options: { uppercase: false } },
      ],
      formatters: {
        blockquoteFormatter,
        horizontalLine
      }
    }
    const text = convert(html, textOptions)

    return {
      html,
      text: text.trim()
    }
  } catch (error) {
    // Check if it's a malformed MDX syntax error
    if (error instanceof Error && error.message.includes('Could not parse')) {
      throw new Error(`Invalid MDX syntax: ${error.message}`)
    }
    
    // If it's about missing components, try to handle gracefully
    if (error instanceof Error && error.message.includes('Expected component')) {
      // Extract component name from error message
      const componentMatch = error.message.match(/Expected component `(\w+)`/)
      const missingComponent = componentMatch ? componentMatch[1] : 'Unknown'
      
      // Create a fallback component that renders children as-is
      const fallbackComponents = {
        ...components,
        [missingComponent]: ({ children }: { children: React.ReactNode }) => 
          React.createElement('div', {}, children)
      }
      
      try {
        // Retry with fallback component
        const compiled = await compile(mdxContent, {
          outputFormat: 'function-body',
          development: false,
        })
        
        const code = String(compiled)
        const mdxFunction = new Function('_jsx_runtime', code)
        const mdxExport = mdxFunction(runtime)
        const MDXContent = mdxExport.default
        
        const element = React.createElement(MDXContent, { components: fallbackComponents })
        const html = renderToStaticMarkup(element)
        
        const fallbackHorizontalLine: FormatCallback = (_elem, _walk, builder) => {
          builder.addInline('\n---\n')
        }
        
        const fallbackTextOptions: HtmlToTextOptions = {
          wordwrap: 130,
          selectors: [
            { selector: 'a', options: { baseUrl: 'https://positiv.com' } },
            { selector: 'hr', format: 'horizontalLine' },
            { selector: 'h1', options: { uppercase: false } },
            { selector: 'h2', options: { uppercase: false } },
            { selector: 'h3', options: { uppercase: false } },
            { selector: 'h4', options: { uppercase: false } },
            { selector: 'h5', options: { uppercase: false } },
            { selector: 'h6', options: { uppercase: false } },
          ],
          formatters: {
            horizontalLine: fallbackHorizontalLine
          }
        }
        const text = convert(html, fallbackTextOptions)
        
        return {
          html,
          text: text.trim()
        }
      } catch (_retryError) {
        // If retry also fails, throw original error
        throw error
      }
    }
    
    // For any other error, just throw it
    throw error
  }
}
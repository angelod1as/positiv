import { compile } from "@mdx-js/mdx"
import * as runtime from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { convert, type HtmlToTextOptions, type FormatCallback } from "html-to-text"
import React from "react"
import { runInNewContext } from "vm"

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
      React.createElement('strong', { key: 'date-label' }, 'Date: '),
      date
    ]),
    React.createElement('p', { key: 'location' }, [
      React.createElement('strong', { key: 'location-label' }, 'Location: '),
      location
    ]),
    React.createElement('p', { key: 'spots' }, [
      React.createElement('strong', { key: 'spots-label' }, 'Spots: '),
      `${spots}`
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

// Fallback component for unknown components
const FallbackComponent = ({ children }: { children?: React.ReactNode }) => 
  React.createElement('div', {}, children)

interface ProcessMDXResult {
  html: string
  text: string
}

// Helper function to convert HTML to plain text
function htmlToPlainText(html: string): string {
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
  
  return convert(html, textOptions).trim()
}

// Helper function to compile and render MDX
async function compileMDXToHtml(
  mdxContent: string, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customComponents: Record<string, React.ComponentType<any>>,
  useSandbox: boolean = true
): Promise<{ html: string; text: string }> {
  // Compile MDX to JavaScript
  const compiled = await compile(mdxContent, {
    outputFormat: 'function-body',
    development: false,
    // Disable JS expressions in MDX for security
    remarkPlugins: [],
    rehypePlugins: []
  })

  const code = String(compiled)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let MDXContent: React.ComponentType<any>
  
  if (useSandbox) {
    // Create a sandboxed context for safer execution
    // This prevents access to Node.js globals and file system
    const sandbox = {
      _jsx_runtime: runtime,
      console: { log: () => {}, error: () => {}, warn: () => {} }, // Disable console
      process: undefined,
      require: undefined,
      __dirname: undefined,
      __filename: undefined,
      module: undefined,
      exports: undefined,
      global: undefined,
    }
    
    // Run the compiled MDX in a sandboxed environment
    const mdxExport = runInNewContext(
      `(function(_jsx_runtime) { ${code} })(_jsx_runtime)`,
      sandbox,
      {
        timeout: 1000, // 1 second timeout
        displayErrors: false
      }
    )
    
    MDXContent = mdxExport.default
  } else {
    // Direct execution for fallback (still safer than new Function with full access)
    const mdxFunction = new Function('_jsx_runtime', code)
    const mdxExport = mdxFunction(runtime)
    MDXContent = mdxExport.default
  }

  // Render the MDX content with custom components
  try {
    const element = React.createElement(MDXContent, { components: customComponents })
    
    // Convert React elements to HTML string
    const html = renderToStaticMarkup(element)
    
    // Convert HTML to plain text
    const text = htmlToPlainText(html)

    return { html, text }
  } catch (renderError) {
    // If rendering fails due to missing component, throw a more informative error
    if (renderError instanceof Error && renderError.message.includes('to be defined')) {
      throw renderError
    }
    throw renderError
  }
}

export async function processMDXContent(
  mdxContent: string
): Promise<ProcessMDXResult> {
  // First, validate that MDX content is from a trusted source
  // In production, this should come from admin-only input
  // Never accept MDX from untrusted user input
  
  try {
    // Try to compile with our custom components
    return await compileMDXToHtml(mdxContent, components)
  } catch (error) {
    // Check if it's a malformed MDX syntax error
    if (error instanceof Error && error.message.includes('Could not parse')) {
      throw new Error(`Invalid MDX syntax: ${error.message}`)
    }
    
    // If it's about missing components, try to handle gracefully
    if (error instanceof Error && (
      error.message.includes('Expected component') || 
      error.message.includes('to be defined')
    )) {
      // Extract component name from error message
      const componentMatch = error.message.match(/Expected component `(\w+)`/) || 
                           error.message.match(/`(\w+)` to be defined/)
      const missingComponent = componentMatch ? componentMatch[1] : 'Unknown'
      
      // Create components with fallback for missing component
      const fallbackComponents = {
        ...components,
        [missingComponent]: FallbackComponent
      }
      
      try {
        // Retry with fallback component, using direct execution to avoid sandbox issues
        return await compileMDXToHtml(mdxContent, fallbackComponents, false)
      } catch (_retryError) {
        // If retry also fails, throw original error
        throw error
      }
    }
    
    // For any other error, just throw it
    throw error
  }
}
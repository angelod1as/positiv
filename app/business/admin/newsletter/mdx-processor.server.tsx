/* eslint-disable react-refresh/only-export-components */
import { compile } from "@mdx-js/mdx"
import * as runtime from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { convert, type HtmlToTextOptions, type FormatCallback } from "html-to-text"
import React from "react"
import { runInNewContext } from "vm"

// Base URL for email links - use environment variable with fallback
const BASE_URL = (process.env.APP_URL && /^https?:\/\//.test(process.env.APP_URL))
  ? process.env.APP_URL
  : 'https://positiv.com'

// Custom email components
const EmailEventCard = ({ title, date, location, spots }: {
  title: string
  date: string
  location: string
  spots: number
}) => {
  return (
    <div 
      className="event-card"
      style={{ 
        border: '1px solid #e5e5e5', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '16px',
        backgroundColor: '#f9f9f9'
      }}
    >
      <h3 style={{ marginTop: 0 }}>🎉 {title}</h3>
      <p>
        <strong>Date: </strong>{date}
      </p>
      <p>
        <strong>Location: </strong>{location}
      </p>
      <p>
        <strong>Spots: </strong>{spots}
      </p>
    </div>
  )
}

const EmailButton = ({ href, children }: {
  href: string
  children: React.ReactNode
}) => {
  // Validate href to prevent javascript: or data: URIs
  const isValidHref = href && (
    href.startsWith('http://') || 
    href.startsWith('https://') || 
    href.startsWith('mailto:') ||
    href.startsWith('/')
  )
  
  const safeHref = isValidHref ? href : '#'
  
  return (
    <a 
      href={safeHref}
      className="button"
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#8b5cf6',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '6px',
        fontWeight: 'bold',
        marginTop: '8px',
        marginBottom: '8px'
      }}
    >
      {children}
    </a>
  )
}

const EmailDivider = () => {
  return (
    <hr 
      style={{ 
        borderTop: '1px solid #e5e5e5',
        marginTop: '24px',
        marginBottom: '24px'
      }} 
    />
  )
}

const EmailQuote = ({ author, children }: {
  author?: string
  children: React.ReactNode
}) => {
  return (
    <blockquote
      style={{
        borderLeft: '4px solid #8b5cf6',
        paddingLeft: '16px',
        marginLeft: 0,
        fontStyle: 'italic',
        color: '#666'
      }}
    >
      <p>{children}</p>
      {author && <p style={{ marginTop: '8px' }}>- {author}</p>}
    </blockquote>
  )
}

// Component mapping for MDX
const components = {
  EventCard: EmailEventCard,
  Button: EmailButton,
  Divider: EmailDivider,
  Quote: EmailQuote,
}

// Fallback component for unknown components
const FallbackComponent = ({ children }: { children?: React.ReactNode }) => (
  <div>{children}</div>
)

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
      { selector: 'a', options: { baseUrl: BASE_URL } },
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

// Block MDX expressions and JSX via remark/rehype plugins
const remarkPlugins = [
  // Block import/export statements and expressions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  () => (tree: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visit = (node: any): void => {
      // Block ESM imports/exports
      if (node.type === 'mdxjsEsm') {
        throw new Error('JavaScript expressions are not allowed in newsletter content for security reasons')
      }
      // Block inline JS expressions {}
      if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') {
        throw new Error('JavaScript expressions are not allowed in newsletter content for security reasons')
      }
      if (node.children) {
        node.children.forEach(visit)
      }
    }
    visit(tree)
  }
]

// Helper function to deep freeze objects
function deepFreeze<T extends object>(obj: T): T {
  Object.getOwnPropertyNames(obj).forEach((name) => {
    const value = obj[name as keyof T]
    if (value && typeof value === 'object') {
      deepFreeze(value as object)
    }
  })
  return Object.freeze(obj)
}

// Helper function to compile and render MDX
async function compileMDXToHtml(
  mdxContent: string, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customComponents: Record<string, React.ComponentType<any>>
): Promise<{ html: string; text: string }> {
  // Compile MDX to JavaScript with security restrictions
  const compiled = await compile(mdxContent, {
    outputFormat: 'function-body',
    development: false,
    // Block JS expressions in MDX for security
    remarkPlugins,
    rehypePlugins: [],
    // Disable MDX provider and imports
    providerImportSource: undefined,
  })

  const code = String(compiled)
  
  // Create a deep-frozen copy of runtime to prevent prototype pollution
  const frozenRuntime = deepFreeze({ ...runtime })
  
  // Create a sandboxed context for safer execution
  // This prevents access to Node.js globals and file system
  const sandbox = deepFreeze({
    _jsx_runtime: frozenRuntime,
    // Explicitly block potentially dangerous globals
    console: undefined,
    process: undefined,
    require: undefined,
    __dirname: undefined,
    __filename: undefined,
    module: undefined,
    exports: undefined,
    global: undefined,
    Buffer: undefined,
    setImmediate: undefined,
    setInterval: undefined,
    setTimeout: undefined,
    clearTimeout: undefined,
    clearInterval: undefined,
    clearImmediate: undefined,
    fetch: undefined,
    XMLHttpRequest: undefined,
    WebSocket: undefined,
  })
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let MDXContent: React.ComponentType<any>
  
  try {
    // Run the compiled MDX in a sandboxed environment
    const mdxExport = runInNewContext(
      `(function(_jsx_runtime) { 
        'use strict';
        ${code} 
      })(_jsx_runtime)`,
      sandbox,
      {
        timeout: 500, // 500ms timeout
        displayErrors: false,
        contextCodeGeneration: {
          strings: false,
          wasm: false
        }
      }
    )
    
    MDXContent = mdxExport.default
  } catch (error) {
    // If sandbox execution fails, check if it's due to missing component
    if (error instanceof Error && error.message.includes('to be defined')) {
      // Re-throw with more context
      throw new Error(`MDX rendering failed: ${error.message}`)
    }
    throw error
  }

  // Render the MDX content with custom components
  try {
    const element = <MDXContent components={customComponents} />
    
    // Convert React elements to HTML string
    const html = renderToStaticMarkup(element)
    
    // Convert HTML to plain text
    const text = htmlToPlainText(html)

    return { html, text }
  } catch (renderError) {
    // If rendering fails due to missing component, throw a more informative error
    if (renderError instanceof Error && renderError.message.includes('to be defined')) {
      throw new Error(`Component rendering failed: ${renderError.message}`)
    }
    throw renderError
  }
}

export async function processMDXContent(
  mdxContent: string
): Promise<ProcessMDXResult> {
  // SECURITY: This function should ONLY accept content from trusted admin users
  // Never accept MDX from untrusted user input
  // Consider adding authentication/authorization checks here
  
  try {
    // Try to compile with our custom components
    return await compileMDXToHtml(mdxContent, components)
  } catch (error) {
    // Check if it's a malformed MDX syntax error
    if (error instanceof Error && error.message.includes('Could not parse')) {
      throw new Error(`Invalid MDX syntax: ${error.message}`)
    }
    
    // Check if it's a security violation
    if (error instanceof Error && error.message.includes('not allowed')) {
      throw error // Re-throw security errors as-is
    }
    
    // If it's about missing components, try with fallback while maintaining sandbox
    if (error instanceof Error && (
      error.message.includes('Component rendering failed') || 
      error.message.includes('to be defined')
    )) {
      // Extract component name from error message
      const componentMatch = error.message.match(/`(\w+)` to be defined/) ||
                           error.message.match(/Expected component `(\w+)`/)
      const missingComponent = componentMatch ? componentMatch[1] : 'Unknown'
      
      // Create components with fallback for missing component
      const fallbackComponents = {
        ...components,
        [missingComponent]: FallbackComponent
      }
      
      try {
        // Retry with fallback component, KEEPING SANDBOX ENABLED
        return await compileMDXToHtml(mdxContent, fallbackComponents)
      } catch (_retryError) {
        // If retry also fails, throw original error
        throw error
      }
    }
    
    // For any other error, just throw it
    throw error
  }
}
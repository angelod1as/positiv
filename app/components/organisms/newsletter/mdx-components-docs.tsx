import { useState } from "react"
import { CheckIcon, CopyIcon, Code2Icon } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

// Email components - same components used in actual email rendering
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

interface ComponentExample {
  name: string
  description: string
  preview: React.ReactNode
  code: string
  parameters: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
}

const mdxComponents: ComponentExample[] = [
  {
    name: "EventCard",
    description: "Exibe informações de um evento com destaque visual",
    preview: (
      <EmailEventCard 
        title="Festival de Verão"
        date="2025-02-15"
        location="Praia de Copacabana"
        spots={200}
      />
    ),
    code: `<EventCard 
  title="Festival de Verão"
  date="2025-02-15"
  location="Praia de Copacabana"
  spots={200}
/>`,
    parameters: [
      {
        name: "title",
        type: "string",
        required: true,
        description: "Título do evento",
      },
      {
        name: "date",
        type: "string",
        required: true,
        description: "Data do evento (formato: YYYY-MM-DD)",
      },
      {
        name: "location",
        type: "string",
        required: true,
        description: "Local do evento",
      },
      {
        name: "spots",
        type: "number",
        required: true,
        description: "Número de vagas disponíveis",
      },
    ],
  },
  {
    name: "Button",
    description: "Botão de call-to-action com link",
    preview: (
      <EmailButton href="#">
        Ver Todos os Eventos
      </EmailButton>
    ),
    code: `<Button href="https://positiv.com/events">
  Ver Todos os Eventos
</Button>`,
    parameters: [
      {
        name: "href",
        type: "string",
        required: true,
        description: "URL de destino do botão",
      },
      {
        name: "children",
        type: "ReactNode",
        required: true,
        description: "Texto ou conteúdo do botão",
      },
    ],
  },
  {
    name: "Divider",
    description: "Linha divisória para separar seções",
    preview: <EmailDivider />,
    code: `<Divider />`,
    parameters: [],
  },
  {
    name: "Quote",
    description: "Citação em destaque com autor opcional",
    preview: (
      <EmailQuote author="João Silva">
        Esta foi uma experiência incrível! Conheci pessoas maravilhosas e me
        diverti muito.
      </EmailQuote>
    ),
    code: `<Quote author="João Silva">
  Esta foi uma experiência incrível! Conheci pessoas maravilhosas e me diverti muito.
</Quote>`,
    parameters: [
      {
        name: "author",
        type: "string",
        required: false,
        description: "Nome do autor da citação (opcional)",
      },
      {
        name: "children",
        type: "ReactNode",
        required: true,
        description: "Texto da citação",
      },
    ],
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch (err) {
          console.error("Failed to copy text with fallback:", err)
        } finally {
          textArea.remove()
        }
      }
    } catch (err) {
      console.error("Failed to copy text:", err)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-8 px-2"
    >
      {copied ? (
        <>
          <CheckIcon className="h-3 w-3 mr-1" />
          Copiado!
        </>
      ) : (
        <>
          <CopyIcon className="h-3 w-3 mr-1" />
          Copiar
        </>
      )}
    </Button>
  )
}

function ComponentCard({ component }: { component: ComponentExample }) {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-lg">{component.name}</h3>
        <p className="text-muted-foreground text-sm">
          {component.description}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Pré-visualização:</span>
        </div>
        <div className="border rounded p-4 bg-gray-50">
          {component.preview}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Código MDX:</span>
          <CopyButton text={component.code} />
        </div>
        <pre className="border rounded p-3 bg-gray-50 overflow-x-auto">
          <code className="text-sm">{component.code}</code>
        </pre>
      </div>

      {component.parameters.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Parâmetros:</span>
          <div className="border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium">Nome</th>
                  <th className="text-left p-2 font-medium">Tipo</th>
                  <th className="text-left p-2 font-medium">Obrigatório</th>
                  <th className="text-left p-2 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {component.parameters.map((param, idx) => (
                  <tr
                    key={param.name}
                    className={cn(idx !== 0 && "border-t")}
                  >
                    <td className="p-2 font-mono text-xs">{param.name}</td>
                    <td className="p-2 font-mono text-xs">{param.type}</td>
                    <td className="p-2">
                      {param.required ? (
                        <span className="text-green-600">Sim</span>
                      ) : (
                        <span className="text-gray-500">Não</span>
                      )}
                    </td>
                    <td className="p-2 text-xs">{param.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function MDXComponentsDocs() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Code2Icon className="h-4 w-4" />
          Componentes MDX
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Componentes MDX Disponíveis</SheetTitle>
          <SheetDescription>
            Copie e cole estes componentes no conteúdo da sua newsletter
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {mdxComponents.map((component) => (
            <ComponentCard key={component.name} component={component} />
          ))}
          
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium mb-2">💡 Dica de Uso</h4>
            <p className="text-sm text-gray-700">
              Você também pode usar Markdown padrão junto com estes componentes.
              Por exemplo:
            </p>
            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
              <code>{`# Título da Newsletter

Parágrafo normal com **negrito** e *itálico*.

<EventCard 
  title="Próximo Evento"
  date="2025-03-01"
  location="São Paulo"
  spots={100}
/>

## Subtítulo

Mais conteúdo aqui...`}</code>
            </pre>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
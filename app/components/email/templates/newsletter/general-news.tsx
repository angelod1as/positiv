import { Heading, Section } from "@react-email/components"
import { EmailWrapper } from "~/components/email/common/wrapper"
import { NewsletterFooter } from "~/components/email/common/newsletter-footer"
import { sanitizeNewsletterHtml } from "~/lib/email/sanitize-html"

interface GeneralNewsProps {
  subject: string
  content: string
  unsubscribeUrl: string
}

export const GeneralNews = ({
  subject,
  content,
  unsubscribeUrl,
}: GeneralNewsProps) => {
  // Sanitize the content to prevent XSS attacks
  const sanitizedContent = sanitizeNewsletterHtml(content)

  return (
    <EmailWrapper
      pageTitle={subject}
      previewText={subject}
      includeFooter={false}
    >
      {/* General News Header */}
      <Section className="border-b-2  pb-4 mb-6">
        <Heading as="h2" className="text-2xl font-bold m-0">
          📰 Novidades da Comunidade
        </Heading>
      </Section>

      {/* Main Content */}
      <Section>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </Section>

      <NewsletterFooter unsubscribeUrl={unsubscribeUrl} />
    </EmailWrapper>
  )
}

GeneralNews.PreviewProps = {
  subject: "Novidades do Positiv - Janeiro 2025",
  content: `
    <h1>Novidades do Positiv! 🎉</h1>
    <p>Olá pessoal!</p>
    <p>Temos ótimas notícias para compartilhar com nossa comunidade.</p>

    <h2>O que vem por aí</h2>
    <ul>
      <li>Novas funcionalidades no site</li>
      <li>Eventos especiais planejados</li>
      <li>Parcerias incríveis</li>
    </ul>

    <blockquote>
      <p>"A comunidade Positiv mudou minha vida! Encontrei amigos verdadeiros e experiências únicas." - Membro da comunidade</p>
    </blockquote>

    <h3>Fique por dentro</h3>
    <p>Continue acompanhando nossas novidades e não perca nenhum evento!</p>

    <p><a href="https://positiv.com/events" class="button">Ver Todos os Eventos</a></p>

    <hr />
    <p><em>Abraços,</em><br />
    <em>Equipe Positiv</em></p>
  `,
  unsubscribeUrl: "https://positiv.com/unsubscribe/xyz789",
}

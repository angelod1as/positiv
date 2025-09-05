import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components"
import { emailTailwindConfig } from "~/components/email/common/email-tailwind-config"
import { EmailHeader } from "~/components/email/common/header"
import { NewsletterFooter } from "~/components/email/common/newsletter-footer"
import { sanitizeNewsletterHtml } from "~/lib/email/sanitize-html"

interface EventAnnouncementProps {
  subject: string
  content: string
  unsubscribeUrl: string
}

export const EventAnnouncement = ({
  subject,
  content,
  unsubscribeUrl,
}: EventAnnouncementProps) => {
  // Sanitize the content to prevent XSS attacks
  const sanitizedContent = sanitizeNewsletterHtml(content)

  return (
    <Html lang="pt-BR">
      <Tailwind config={emailTailwindConfig}>
        <>
          <Head>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>{`${subject} - Positiv Party`}</title>
          </Head>
          <Preview>{subject}</Preview>
          <Body className="bg-black bg-no-repeat bg-positiv-gradient font-sans min-h-screen">
            <Container className="bg-white max-w-3xl my-8 shadow-lg">
              <Container className="max-w-md p-4">
                <EmailHeader />

                {/* Event Announcement Banner */}
                <Section className="rounded-lg p-6 mb-6 text-center">
                  <Heading as="h2" className="text-2xl font-bold m-0">
                    🎉 Anúncio de Evento
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
              </Container>
            </Container>
          </Body>
        </>
      </Tailwind>
    </Html>
  )
}

EventAnnouncement.PreviewProps = {
  subject: "Novo Evento: Festa de Verão 2025",
  content: `
    <h1>Festa de Verão 2025</h1>
    <p>Olá pessoal!</p>
    <p>Temos o prazer de anunciar nosso próximo evento incrível!</p>
    <div class="event-card">
      <h3>🌞 Festa de Verão</h3>
      <p><strong>Data:</strong> 15 de fevereiro de 2025</p>
      <p><strong>Local:</strong> A definir</p>
      <p><strong>Vagas:</strong> 50 pessoas</p>
    </div>
    <p>Prepare-se para uma noite inesquecível com muita música, diversão e conexões genuínas!</p>
    <p><a href="https://positiv.com/events" class="button">Ver Todos os Eventos</a></p>
    <hr />
    <p><em>Abraços,</em><br />
    <em>Equipe Positiv</em></p>
  `,
  unsubscribeUrl: "https://positiv.com/unsubscribe/abc123",
}

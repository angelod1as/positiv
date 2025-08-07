import {
  Body,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components"
import { EmailHeader } from "~/components/email/common/header"
import { NewsletterFooter } from "~/components/email/common/newsletter-footer"
import { emailTailwindConfig } from "~/components/email/common/email-tailwind-config"
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
    <Html lang="pt-BR">
      <Tailwind config={emailTailwindConfig}>
        <>
          <Head>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>{`${subject} - Positiv Party`}</title>
            <Font
              fontFamily="Nunito"
              fallbackFontFamily="Verdana"
              webFont={{
                url: "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshdTo3j6zbXWjgevT5.woff2",
                format: "woff2",
              }}
              fontWeight={400}
              fontStyle="normal"
            />
          </Head>
          <Preview>{subject}</Preview>
          <Body className="bg-black bg-no-repeat bg-positiv-gradient font-sans min-h-screen">
            <Container className="bg-white max-w-3xl my-8 shadow-lg">
              <Container className="max-w-md p-4">
                <EmailHeader />
                
                {/* General News Header */}
                <Section className="border-b-2 border-lightgreen pb-4 mb-6">
                  <Heading as="h2" className="text-2xl font-bold text-purple m-0">
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
              </Container>
            </Container>
          </Body>
        </>
      </Tailwind>
    </Html>
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
  unsubscribeUrl: "https://positiv.com/unsubscribe?token=xyz789",
}
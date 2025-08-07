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
  type TailwindConfig,
} from "@react-email/components"
import { EmailHeader } from "~/components/email/common/header"
import { NewsletterFooter } from "~/components/email/common/newsletter-footer"

const tailwindConfig: TailwindConfig = {
  theme: {
    extend: {
      colors: {
        lightgreen: "#00ffd3",
        green: "#00dd87",
        blue: "#4a75d2",
        purple: "#bf03c3",
        red: "#b7002d",
        yellow: "#ece010",
      },
    },
    fontSize: {
      xs: ["12px", { lineHeight: "16px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "24px" }],
      lg: ["18px", { lineHeight: "28px" }],
      xl: ["20px", { lineHeight: "28px" }],
      "2xl": ["24px", { lineHeight: "32px" }],
      "3xl": ["30px", { lineHeight: "36px" }],
      "4xl": ["36px", { lineHeight: "36px" }],
      "5xl": ["48px", { lineHeight: "1" }],
      "6xl": ["60px", { lineHeight: "1" }],
      "7xl": ["72px", { lineHeight: "1" }],
      "8xl": ["96px", { lineHeight: "1" }],
      "9xl": ["144px", { lineHeight: "1" }],
    },
    spacing: {
      px: "1px",
      0: "0",
      0.5: "2px",
      1: "4px",
      1.5: "6px",
      2: "8px",
      2.5: "10px",
      3: "12px",
      3.5: "14px",
      4: "16px",
      5: "20px",
      6: "24px",
      7: "28px",
      8: "32px",
      9: "36px",
      10: "40px",
      11: "44px",
      12: "48px",
      14: "56px",
      16: "64px",
      20: "80px",
      24: "96px",
      28: "112px",
      32: "128px",
      36: "144px",
      40: "160px",
      44: "176px",
      48: "192px",
      52: "208px",
      56: "224px",
      60: "240px",
      64: "256px",
      72: "288px",
      80: "320px",
      96: "384px",
    },
  },
}

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
  return (
    <Html lang="pt-BR">
      <Tailwind config={tailwindConfig}>
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
                
                {/* Event Announcement Banner */}
                <Section className="bg-gradient-to-r from-purple to-green text-white rounded-lg p-6 mb-6 text-center">
                  <Heading as="h2" className="text-2xl font-bold m-0">
                    🎉 Anúncio de Evento
                  </Heading>
                </Section>
                
                {/* Main Content */}
                <Section>
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: content }}
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
  unsubscribeUrl: "https://positiv.com/unsubscribe?token=abc123",
}
import { describe, expect, it } from "vitest"
import { formatNewsletterMail } from "./format-newsletter-mail"

describe("formatNewsletterMail", () => {
  const baseProps = {
    subject: "Test Newsletter",
    content: "<h1>Test Content</h1><p>This is a test newsletter.</p>",
    unsubscribeUrl: "https://positiv.com/unsubscribe/test123",
  }

  describe("Event Announcement Template", () => {
    it("should generate HTML and text versions for event announcement", async () => {
      const result = await formatNewsletterMail({
        ...baseProps,
        template: "event-announcement",
      })

      expect(result.html).toBeDefined()
      expect(result.text).toBeDefined()
      expect(result.html).toContain("Test Content")
      expect(result.html).toContain("This is a test newsletter")
      expect(result.html).toContain(baseProps.unsubscribeUrl)
      expect(result.html).toContain("Anúncio de Evento")

      // Text version should not contain HTML tags
      expect(result.text).not.toContain("<h1>")
      expect(result.text).not.toContain("<p>")
      expect(result.text).toContain("TEST CONTENT") // HTML to text converts headers to uppercase
      expect(result.text).toContain("This is a test newsletter")
    })

    it("should handle complex MDX-generated content", async () => {
      const mdxContent = `
        <h2>Festa de Verão 2025</h2>
        <div class="event-card">
          <h3>🌞 Detalhes do Evento</h3>
          <p><strong>Data:</strong> 15 de fevereiro de 2025</p>
          <p><strong>Local:</strong> A definir</p>
          <p><strong>Vagas:</strong> 50 pessoas</p>
        </div>
        <p>Prepare-se para uma noite inesquecível!</p>
        <a href="https://positiv.com/events" class="button">Ver Eventos</a>
      `

      const result = await formatNewsletterMail({
        subject: "Novo Evento",
        content: mdxContent,
        template: "event-announcement",
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      })

      expect(result.html).toContain("Festa de Verão 2025")
      expect(result.html).toContain("15 de fevereiro de 2025")
      expect(result.html).toContain("50 pessoas")
      expect(result.html).toContain("Ver Eventos")

      // Check text conversion (headers are uppercase in text)
      expect(result.text).toContain("FESTA DE VERÃO 2025")
      expect(result.text).toContain("15 de fevereiro de 2025")
      expect(result.text).not.toContain("<strong>")
    })
  })

  describe("General News Template", () => {
    it("should generate HTML and text versions for general news", async () => {
      const result = await formatNewsletterMail({
        ...baseProps,
        template: "general-news",
      })

      expect(result.html).toBeDefined()
      expect(result.text).toBeDefined()
      expect(result.html).toContain("Test Content")
      expect(result.html).toContain("This is a test newsletter")
      expect(result.html).toContain(baseProps.unsubscribeUrl)
      expect(result.html).toContain("Novidades da Comunidade")

      // Text version validation
      expect(result.text).not.toContain("<h1>")
      expect(result.text).toContain("TEST CONTENT") // Headers are uppercase in text
    })

    it("should handle newsletter with quotes and lists", async () => {
      const contentWithQuotes = `
        <h2>Atualizações da Comunidade</h2>
        <ul>
          <li>Nova funcionalidade X</li>
          <li>Melhoria Y</li>
          <li>Correção Z</li>
        </ul>
        <blockquote>
          <p>"Experiência incrível na comunidade!" - Membro</p>
        </blockquote>
        <hr />
        <p><em>Abraços,</em><br />
        <em>Equipe Positiv</em></p>
      `

      const result = await formatNewsletterMail({
        subject: "Newsletter Mensal",
        content: contentWithQuotes,
        template: "general-news",
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      })

      expect(result.html).toContain("Atualizações da Comunidade")
      expect(result.html).toContain("Nova funcionalidade X")
      expect(result.html).toContain("Experiência incrível na comunidade!")
      expect(result.html).toContain("Equipe Positiv")

      // Text should preserve list structure
      expect(result.text).toContain("Nova funcionalidade X")
      expect(result.text).toContain("Melhoria Y")
      expect(result.text).toContain("Correção Z")
    })
  })

  describe("Common Functionality", () => {
    it("should include unsubscribe link for both templates", async () => {
      const eventResult = await formatNewsletterMail({
        ...baseProps,
        template: "event-announcement",
      })

      const newsResult = await formatNewsletterMail({
        ...baseProps,
        template: "general-news",
      })

      expect(eventResult.html).toContain(baseProps.unsubscribeUrl)
      expect(eventResult.html).toContain("descadastrar")
      expect(newsResult.html).toContain(baseProps.unsubscribeUrl)
      expect(newsResult.html).toContain("descadastrar")
    })

    it("should properly handle special characters in Brazilian Portuguese", async () => {
      const content = `
        <h1>Atenção: Próxima Edição</h1>
        <p>Não perca nossa próxima edição com várias atrações!</p>
        <p>Será uma experiência única e inesquecível.</p>
      `

      const result = await formatNewsletterMail({
        subject: "Edição Especial",
        content,
        template: "general-news",
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      })

      expect(result.html).toContain("Atenção")
      expect(result.html).toContain("Próxima Edição")
      expect(result.html).toContain("várias atrações")
      expect(result.html).toContain("única e inesquecível")

      // Text should preserve special characters (headers are uppercase)
      expect(result.text).toContain("ATENÇÃO")
      expect(result.text).toContain("PRÓXIMA EDIÇÃO")
    })

    it("should handle empty content gracefully", async () => {
      const result = await formatNewsletterMail({
        subject: "Empty Newsletter",
        content: "",
        template: "event-announcement",
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      })

      expect(result.html).toBeDefined()
      expect(result.text).toBeDefined()
      expect(result.html).toContain("Positiv")
      expect(result.html).toContain("https://positiv.com/unsubscribe")
    })
  })
})

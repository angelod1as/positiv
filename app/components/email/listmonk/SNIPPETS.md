# Listmonk HTML Snippets

Reusable HTML components to copy-paste into your Listmonk campaigns. These work with the `default.html` template and maintain Positiv brand styling.

## Buttons

### Primary Button (Purple)

```html
<div style="text-align: center; margin: 24px 0;">
  <a href="https://www.positivparty.com" style="display: inline-block; background: #bf03c3; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: 'Nunito', Arial, sans-serif; box-shadow: 0 2px 8px rgba(191,3,195,0.3);">
    Texto do Botão
  </a>
</div>
```

### Secondary Button (Blue)

```html
<div style="text-align: center; margin: 24px 0;">
  <a href="https://www.positivparty.com" style="display: inline-block; background: #4a75d2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: 'Nunito', Arial, sans-serif; box-shadow: 0 2px 8px rgba(74,117,210,0.3);">
    Texto do Botão
  </a>
</div>
```

### Outline Button

```html
<div style="text-align: center; margin: 24px 0;">
  <a href="https://www.positivparty.com" style="display: inline-block; background: transparent; color: #bf03c3; text-decoration: none; padding: 14px 32px; border-radius: 8px; border: 2px solid #bf03c3; font-weight: 700; font-size: 16px; font-family: 'Nunito', Arial, sans-serif;">
    Texto do Botão
  </a>
</div>
```

## Call-out Boxes

### Info Box (Purple)

```html
<div style="background: #f9f5ff; border-left: 4px solid #bf03c3; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0; color: #555555;">
    <strong style="color: #bf03c3;">💡 Dica:</strong> Seu texto informativo aqui.
  </p>
</div>
```

### Success Box (Green)

```html
<div style="background: #f0fdf4; border-left: 4px solid #00dd87; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0; color: #555555;">
    <strong style="color: #00dd87;">✓ Sucesso:</strong> Sua mensagem de sucesso aqui.
  </p>
</div>
```

### Warning Box (Yellow)

```html
<div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0; color: #555555;">
    <strong style="color: #f59e0b;">⚠️ Atenção:</strong> Sua mensagem de alerta aqui.
  </p>
</div>
```

## Image with Caption

```html
<div style="text-align: center; margin: 30px 0;">
  <img src="https://example.com/image.jpg" alt="Descrição da imagem" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  <p style="font-size: 14px; color: #666666; font-style: italic; margin-top: 8px;">
    Legenda da imagem
  </p>
</div>
```

## Dividers

### Simple Divider

```html
<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
```

### Thick Purple Divider

```html
<hr style="border: none; border-top: 3px solid #bf03c3; margin: 30px 0; width: 100px; margin-left: auto; margin-right: auto;">
```

### Gradient Divider

```html
<div style="height: 2px; background: linear-gradient(90deg, #4a75d2 0%, #bf03c3 100%); margin: 30px 0;"></div>
```

## Stat Cards (Side by Side)

```html
<table style="width: 100%; margin: 30px 0; border-collapse: collapse;">
  <tr>
    <td style="width: 50%; padding: 0 8px 0 0;">
      <div style="background: #f9f5ff; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #bf03c3;">
        <div style="font-size: 32px; font-weight: 800; color: #bf03c3; margin-bottom: 8px;">150+</div>
        <div style="font-size: 14px; color: #666666;">Eventos Realizados</div>
      </div>
    </td>
    <td style="width: 50%; padding: 0 0 0 8px;">
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #4a75d2;">
        <div style="font-size: 32px; font-weight: 800; color: #4a75d2; margin-bottom: 8px;">500+</div>
        <div style="font-size: 14px; color: #666666;">Participantes</div>
      </div>
    </td>
  </tr>
</table>
```

## Quote Block

```html
<blockquote style="margin: 20px 0; padding: 16px 20px; background: #f9f5ff; border-left: 4px solid #bf03c3; color: #555555; font-style: italic; font-size: 18px;">
  "Sua citação inspiradora aqui. Pode ser um depoimento ou mensagem especial."
  <div style="margin-top: 12px; font-size: 14px; font-style: normal; color: #666666;">
    — Nome da Pessoa
  </div>
</blockquote>
```

## Two-Column Layout

```html
<table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
  <tr>
    <td style="width: 50%; padding-right: 12px; vertical-align: top;">
      <h3 style="color: #bf03c3; font-size: 20px; margin-top: 0;">Coluna 1</h3>
      <p>Conteúdo da primeira coluna aqui.</p>
    </td>
    <td style="width: 50%; padding-left: 12px; vertical-align: top;">
      <h3 style="color: #4a75d2; font-size: 20px; margin-top: 0;">Coluna 2</h3>
      <p>Conteúdo da segunda coluna aqui.</p>
    </td>
  </tr>
</table>
```

## Event Card

```html
<div style="background: #ffffff; border: 2px solid #bf03c3; border-radius: 10px; padding: 20px; margin: 30px 0; box-shadow: 0 2px 8px rgba(191,3,195,0.2);">
  <h2 style="color: #bf03c3; margin-top: 0; font-size: 24px;">🎉 Nome do Evento</h2>
  <p style="margin: 8px 0; color: #333333;">
    <strong>📅 Data:</strong> 15 de Janeiro, 2025<br>
    <strong>🕐 Horário:</strong> 19h00 - 23h00<br>
    <strong>📍 Local:</strong> São Paulo, SP
  </p>
  <p style="margin: 16px 0 20px 0; color: #555555;">
    Descrição breve do evento. O que os participantes podem esperar e por que devem comparecer.
  </p>
  <div style="text-align: center;">
    <a href="https://www.positivparty.com/eventos" style="display: inline-block; background: #bf03c3; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px;">
      Inscrever-se
    </a>
  </div>
</div>
```

## Social Media Links

```html
<div style="text-align: center; margin: 30px 0;">
  <p style="color: #666666; margin-bottom: 12px;">Siga-nos nas redes sociais:</p>
  <a href="https://instagram.com/positivparty" style="display: inline-block; margin: 0 8px; text-decoration: none;">
    <img src="https://example.com/instagram-icon.png" alt="Instagram" style="width: 32px; height: 32px;">
  </a>
  <a href="https://facebook.com/positivparty" style="display: inline-block; margin: 0 8px; text-decoration: none;">
    <img src="https://example.com/facebook-icon.png" alt="Facebook" style="width: 32px; height: 32px;">
  </a>
  <a href="https://twitter.com/positivparty" style="display: inline-block; margin: 0 8px; text-decoration: none;">
    <img src="https://example.com/twitter-icon.png" alt="Twitter" style="width: 32px; height: 32px;">
  </a>
</div>
```

## Countdown Timer (Static)

```html
<div style="text-align: center; margin: 30px 0; background: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); padding: 30px; border-radius: 10px;">
  <p style="color: #ffffff; font-size: 18px; margin: 0 0 16px 0; font-weight: 700;">
    Faltam apenas:
  </p>
  <table style="margin: 0 auto; border-collapse: collapse;">
    <tr>
      <td style="background: rgba(255,255,255,0.2); padding: 12px 16px; border-radius: 8px; margin: 0 4px;">
        <div style="font-size: 32px; font-weight: 800; color: #ffffff; line-height: 1;">7</div>
        <div style="font-size: 12px; color: #ffffff; margin-top: 4px;">DIAS</div>
      </td>
      <td style="color: #ffffff; font-size: 24px; padding: 0 8px;">:</td>
      <td style="background: rgba(255,255,255,0.2); padding: 12px 16px; border-radius: 8px; margin: 0 4px;">
        <div style="font-size: 32px; font-weight: 800; color: #ffffff; line-height: 1;">12</div>
        <div style="font-size: 12px; color: #ffffff; margin-top: 4px;">HORAS</div>
      </td>
      <td style="color: #ffffff; font-size: 24px; padding: 0 8px;">:</td>
      <td style="background: rgba(255,255,255,0.2); padding: 12px 16px; border-radius: 8px; margin: 0 4px;">
        <div style="font-size: 32px; font-weight: 800; color: #ffffff; line-height: 1;">30</div>
        <div style="font-size: 12px; color: #ffffff; margin-top: 4px;">MIN</div>
      </td>
    </tr>
  </table>
</div>
```

## Usage Tips

1. **Copy entire snippet** - Don't modify inline styles unless you know what you're doing
2. **Replace URLs** - Update `href` links and image `src` attributes
3. **Update text** - Change the placeholder text to your content
4. **Test first** - Always send a test email before the actual campaign
5. **Combine snippets** - Mix and match these components to create rich emails

## Brand Colors Reference

- **Primary Purple:** `#bf03c3`
- **Secondary Blue:** `#4a75d2`
- **Green:** `#00dd87`
- **Text Dark:** `#333333`
- **Text Medium:** `#555555`
- **Text Light:** `#666666`
- **Border/Divider:** `#e0e0e0`
- **Background Light:** `#f9f9f9`

## Need More?

See the complete design system: `/app/components/email/_design-system.md`

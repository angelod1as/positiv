# MDX Component Library Reference

## Overview

MDX allows you to use React components within your newsletter content. This gives you powerful, reusable elements that render beautifully in emails while maintaining consistency.

## Available Components

### EventCard

Displays event information in an attractive card format.

#### Usage
```mdx
<EventCard 
  title="Summer Beach Party"
  date="2025-07-15"
  location="Copacabana Beach"
  spots={50}
/>
```

#### Props
- `title` (string, required): Event name
- `date` (string, required): Event date (format: YYYY-MM-DD)
- `location` (string, required): Event venue
- `spots` (number, required): Available spots

#### Example Output
```
┌─────────────────────────────┐
│ 🎉 Summer Beach Party       │
│                             │
│ Date: 2025-07-15           │
│ Location: Copacabana Beach  │
│ Spots: 50                   │
└─────────────────────────────┘
```

#### Best Practices
- Always include all required props
- Use meaningful event titles
- Keep location names concise
- Update spots as they fill

### Button

Creates a call-to-action button that stands out.

#### Usage
```mdx
<Button href="https://positiv.com/events">
  View All Events
</Button>
```

#### Props
- `href` (string, required): Destination URL
- `children` (string/element, required): Button text

#### Styling
- Purple background (#8b5cf6)
- White text
- Rounded corners
- Hover effect in supported clients

#### Examples
```mdx
<!-- Simple button -->
<Button href="https://positiv.com/register">
  Register Now
</Button>

<!-- Event-specific button -->
<Button href="https://positiv.com/events/summer-party">
  Reserve Your Spot
</Button>

<!-- General CTA -->
<Button href="https://positiv.com/profile">
  Update Your Profile
</Button>
```

#### Best Practices
- Use action-oriented text ("Register", "Join", "Learn More")
- Keep button text short (2-4 words ideal)
- Always use full URLs (https://...)
- Limit to 1-2 buttons per newsletter

### Divider

Adds a horizontal line to separate sections.

#### Usage
```mdx
<Divider />
```

#### No props required

#### When to Use
- Between major sections
- Before footer content
- After important announcements
- To create visual breathing room

#### Example
```mdx
# Main Announcement

Important content here...

<Divider />

# Secondary News

Other updates...

<Divider />

*Footer content*
```

### Quote

Displays testimonials or featured quotes with attribution.

#### Usage
```mdx
<Quote author="João Silva">
  Positiv changed my life! The community is amazing and the events are unforgettable.
</Quote>
```

#### Props
- `author` (string, optional): Person being quoted
- `children` (string/element, required): Quote content

#### Examples
```mdx
<!-- With author -->
<Quote author="Maria Santos">
  I've made lifelong friends through Positiv events.
</Quote>

<!-- Without author (anonymous) -->
<Quote>
  Best community I've ever been part of!
</Quote>

<!-- Longer testimonial -->
<Quote author="Pedro Oliveira">
  When I joined Positiv, I was looking for events to attend. 
  What I found was a family. The organizers care deeply about 
  creating safe, inclusive spaces for everyone.
</Quote>
```

#### Styling
- Purple left border
- Italic text
- Indented layout
- Author attribution in smaller text

## Markdown Basics

In addition to components, you can use standard Markdown:

### Headings
```markdown
# Main Title (H1)
## Section Title (H2)
### Subsection (H3)
#### Small Heading (H4)
```

### Text Formatting
```markdown
**Bold text**
*Italic text*
***Bold and italic***
~~Strikethrough~~
```

### Lists
```markdown
<!-- Unordered -->
- Item one
- Item two
  - Nested item
  - Another nested

<!-- Ordered -->
1. First step
2. Second step
3. Third step

<!-- Task list -->
- [x] Completed task
- [ ] Pending task
```

### Links
```markdown
[Link text](https://example.com)
[Email link](mailto:contact@positiv.com)
```

### Images
```markdown
![Alt text](https://example.com/image.jpg)
```
*Note: Use images sparingly as they may not render in all email clients*

### Code
````markdown
<!-- Inline code -->
Use the `<EventCard>` component

<!-- Code block -->
```
function example() {
  return "Hello!"
}
```
````

### Blockquotes
```markdown
> This is a blockquote
> It can span multiple lines
```

### Tables
```markdown
| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
| Data 3   | Data 4   |
```
*Note: Table support varies by email client*

## Complete Newsletter Examples

### Event Announcement Template
```mdx
# 🎉 Próximo Evento Imperdível!

Olá pessoal! Temos um evento incrível chegando.

<EventCard 
  title="Festa de Verão 2025"
  date="2025-02-15"
  location="Praia de Copacabana"
  spots={100}
/>

## Por que participar?

- 🏖️ Local paradisíaco
- 🎵 DJ ao vivo
- 🍹 Open bar incluído
- 🤝 Networking incrível

<Button href="https://positiv.com/events/summer-2025">
  Garantir Minha Vaga
</Button>

<Divider />

### Depoimento de quem já foi

<Quote author="Ana Costa">
  A festa de verão do ano passado foi inesquecível! 
  Mal posso esperar para a deste ano.
</Quote>

<Divider />

*Abraços,*  
**Equipe Positiv**

---

*Você está recebendo este email porque se inscreveu para receber nossas novidades.*
```

### Community Update Template
```mdx
# 📰 Novidades da Comunidade Positiv

## Destaques do Mês

### 🏆 Conquistas
Ultrapassamos **500 membros** ativos! Obrigado por fazer parte dessa jornada.

### 📅 Próximos Eventos

<EventCard 
  title="Workshop de Fotografia"
  date="2025-02-10"
  location="Centro Cultural"
  spots={20}
/>

<EventCard 
  title="Trilha da Pedra Bonita"
  date="2025-02-17"
  location="São Conrado"
  spots={15}
/>

<Divider />

## 💬 Da Nossa Comunidade

<Quote author="Carlos Mendes">
  Participar dos eventos do Positiv me ajudou a superar minha timidez 
  e fazer amizades verdadeiras.
</Quote>

<Quote author="Lucia Ferreira">
  A organização é impecável e o cuidado com cada detalhe faz toda diferença.
</Quote>

<Divider />

## 🎯 Ação do Mês

Atualize seu perfil para receber recomendações personalizadas de eventos!

<Button href="https://positiv.com/profile">
  Atualizar Perfil
</Button>

---

*Até a próxima!*  
**Time Positiv** 💜
```

### Welcome Newsletter Template
```mdx
# 👋 Bem-vindo ao Positiv!

Que alegria ter você conosco!

## Primeiros Passos

1. **Complete seu perfil** - Nos ajuda a recomendar os melhores eventos
2. **Explore os eventos** - Temos opções para todos os gostos
3. **Faça sua primeira inscrição** - O primeiro passo para novas amizades!

<Divider />

## Seu Primeiro Evento

Recomendamos começar com um dos nossos eventos mais acolhedores:

<EventCard 
  title="Café com Novatos"
  date="2025-02-05"
  location="Café do Centro"
  spots={30}
/>

Este evento é perfeito para:
- Conhecer outros membros novos
- Entender melhor a comunidade
- Tirar todas suas dúvidas
- Fazer seus primeiros amigos

<Button href="https://positiv.com/events/cafe-novatos">
  Quero Participar!
</Button>

<Divider />

## Dicas Para Aproveitar ao Máximo

- **Seja você mesmo** - Autenticidade é nosso valor principal
- **Chegue no horário** - Aproveite desde o início
- **Interaja** - Todos estão ali para conhecer pessoas novas
- **Divirta-se** - Este é o mais importante!

<Quote>
  Todos já foram novatos um dia. Você será muito bem recebido!
</Quote>

---

*Qualquer dúvida, estamos aqui!*  
**Equipe Positiv** 🌟
```

## Tips for Effective MDX Content

### Do's ✅
- Keep components simple and focused
- Test preview before sending
- Use components consistently
- Provide all required props
- Mix components with regular markdown

### Don'ts ❌
- Don't nest components unnecessarily
- Don't use too many components (3-4 max)
- Don't forget closing tags
- Don't use invalid prop values
- Don't rely solely on components

## Common Issues and Solutions

### Component Not Rendering
**Problem**: Component appears as plain text
**Solution**: Check closing tag and prop syntax

```mdx
<!-- Wrong -->
<EventCard title="Test" date="2025-01-01" location="Here" spots=50>

<!-- Correct -->
<EventCard title="Test" date="2025-01-01" location="Here" spots={50} />
```

### Props Not Working
**Problem**: Component renders but data is missing
**Solution**: Ensure prop names match exactly

```mdx
<!-- Wrong -->
<EventCard Title="Test" Date="2025-01-01" />

<!-- Correct -->
<EventCard title="Test" date="2025-01-01" location="Here" spots={50} />
```

### Spacing Issues
**Problem**: Components too close together
**Solution**: Add blank lines or dividers

```mdx
<!-- Better spacing -->
Text before component

<EventCard ... />

Text after component
```

## Advanced Techniques

### Combining Multiple Components
```mdx
# Event Series

<EventCard title="Part 1" date="2025-02-01" location="Room A" spots={20} />

<EventCard title="Part 2" date="2025-02-08" location="Room A" spots={20} />

<EventCard title="Part 3" date="2025-02-15" location="Room A" spots={20} />

<Button href="https://positiv.com/series/register">
  Register for All Three
</Button>
```

### Conditional Content Ideas
While MDX doesn't support true conditionals, you can prepare different versions:

```mdx
<!-- Version for Veterans -->
# Welcome Back, Veteran!
Your experience makes our community stronger...

<!-- Version for Newbies -->
# Welcome, New Member!
We're excited to have you join us...
```

## Email Client Compatibility

| Component | Gmail | Outlook | Apple Mail | Mobile |
|-----------|-------|---------|------------|--------|
| EventCard | ✅ | ✅ | ✅ | ✅ |
| Button | ✅ | ✅ | ✅ | ✅ |
| Divider | ✅ | ✅ | ✅ | ✅ |
| Quote | ✅ | ✅ | ✅ | ✅ |
| Markdown | ✅ | Partial | ✅ | ✅ |

## Quick Reference Card

```mdx
<!-- Event Info -->
<EventCard title="" date="" location="" spots={0} />

<!-- CTA Button -->
<Button href="">Text</Button>

<!-- Section Separator -->
<Divider />

<!-- Testimonial -->
<Quote author="">Text</Quote>

<!-- Headings -->
# H1 ## H2 ### H3

<!-- Formatting -->
**bold** *italic* [link](url)

<!-- Lists -->
- Bullet
1. Number
```
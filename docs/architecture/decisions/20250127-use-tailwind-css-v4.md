# Use Tailwind CSS v4 for Styling

- Status: accepted
- Date: 2025-01-27
- Tags: frontend, styling, css

## Context

Positiv needed a styling solution that:

- Works well with React and component-based architecture
- Provides consistent design tokens (colors, spacing, etc.)
- Integrates with ShadcN UI components
- Offers good developer experience with autocompletion
- Performs well (no runtime CSS-in-JS overhead)

## Decision

We use **Tailwind CSS v4** with the Vite plugin for styling:

- Utility-first CSS directly in component markup
- Design tokens defined in CSS variables
- ShadcN UI components for consistent base components
- Dark mode support via CSS variables

```tsx
// Utility classes directly in components
<button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
  Click me
</button>
```

Configuration:

```typescript
// vite.config.ts
import tailwindcss from "@tailwindcss/vite"

export default {
  plugins: [tailwindcss()],
}
```

## Consequences

### Positive

- Fast build times with Vite plugin
- No runtime overhead (CSS generated at build time)
- Excellent IDE support with autocomplete
- Consistent design system via CSS variables
- ShadcN UI provides professional components
- Easy responsive design with breakpoint prefixes
- Purges unused CSS automatically

### Negative

- Long class strings can be hard to read
- Learning curve for utility-first approach
- Must maintain design tokens manually
- Custom designs require extending configuration
- Conditional styling can be verbose

### Neutral

- v4 is newer, some v3 patterns changed
- Can still use regular CSS when needed
- Compatible with CSS modules if preferred

## Alternatives Considered

1. **CSS Modules**
   - Pros: Scoped styles, familiar CSS syntax
   - Cons: More files, less design consistency

2. **styled-components / Emotion**
   - Pros: CSS-in-JS flexibility, dynamic styles
   - Cons: Runtime overhead, bundle size

3. **Vanilla Extract**
   - Pros: Type-safe, zero-runtime
   - Cons: More setup, less ecosystem

4. **Plain CSS with BEM**
   - Pros: No dependencies, standard CSS
   - Cons: Manual scoping, harder to maintain

## References

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [ShadcN UI](https://ui.shadcn.com/)
- [@tailwindcss/vite](https://tailwindcss.com/docs/installation/vite)

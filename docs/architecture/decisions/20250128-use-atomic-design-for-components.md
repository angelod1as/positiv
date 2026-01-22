# Use Atomic Design for Component Organization

- Status: accepted
- Date: 2025-01-28
- Tags: frontend, architecture, components

## Context

As Positiv's UI grew, we needed a consistent way to organize React components that:

- Scales with project growth
- Makes components easy to find
- Encourages reusability
- Provides clear hierarchy of complexity
- Helps new developers understand where to add code

## Decision

We follow **Atomic Design** principles for component organization:

```
/app/components
  /atoms          # Basic building blocks (Button, Input, Badge)
  /molecules      # Simple combinations (FormField, Card, SearchBox)
  /organisms      # Complex, self-contained sections (Header, DataTable, Forms)
  /pages          # Page-specific components (not routes)
  /ui             # ShadcN UI components (external library)
```

**Guidelines:**

- **Atoms**: Single-purpose, no business logic, highly reusable
- **Molecules**: Combine atoms, minimal logic, reusable across features
- **Organisms**: Feature-complete sections, may have business logic
- **Pages**: Components tied to specific routes, use organisms

## Consequences

### Positive

- Clear mental model for component complexity
- Easy to find components based on their purpose
- Encourages building reusable atoms/molecules first
- Prevents "god components" by enforcing hierarchy
- New developers understand where to look/add code
- Works well with Tailwind/ShadcN component patterns

### Negative

- Some components don't fit neatly into categories
- Can lead to over-abstraction if followed too rigidly
- Debates about "is this a molecule or organism?"
- Additional directory navigation

### Neutral

- Not enforced by tooling, relies on team discipline
- ShadcN components live in `/ui` as they're external
- Route components stay in `/pages` (React Router convention)

## Alternatives Considered

1. **Feature-based organization**
   - Pros: All feature code together, good for large teams
   - Cons: Harder to share components, duplicate atoms

2. **Flat structure**
   - Pros: Simple, no decisions needed
   - Cons: Doesn't scale, hard to find components

3. **Domain-driven organization**
   - Pros: Aligns with business domains
   - Cons: UI components often cross domains

4. **Component libraries (separate package)**
   - Pros: Strict boundaries, versioning
   - Cons: Overhead for single-project development

## References

- [Atomic Design by Brad Frost](https://atomicdesign.bradfrost.com/)
- [ShadcN UI](https://ui.shadcn.com/)
- Component location: `app/components/`

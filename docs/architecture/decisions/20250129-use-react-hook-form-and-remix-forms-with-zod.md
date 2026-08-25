# Use React Hook Form and Remix Forms with Zod

- Status: superseded
- Date: 2025-01-29
- Tags: forms, validation, frontend

> **Superseded (POS-490).** remix-forms and the `SchemaForm` wrapper this ADR
> describes were removed from the codebase. Every form now runs on the form
> runtime in `app/components/forms/runtime`, which drives a flow of questions
> from a schema and renders it through one of the presentations in
> `runtime/presentations`. React Hook Form and Zod stay. The document is kept
> for the record of why the original choice was made.

## Context

Positiv has numerous forms: user registration, event applications, admin data editing, profile management, etc. We needed a form solution that:

- Provides excellent TypeScript support
- Validates on both client and server with shared schemas
- Handles complex form state (dirty tracking, errors, submission)
- Integrates well with React Router's action/fetcher patterns

## Decision

We use **two complementary approaches** depending on the form's complexity:

### 1. Remix Forms (Primary - Standard Forms)

For most forms that submit to server actions, we use **remix-forms** with our `SchemaForm` wrapper:

- Automatic form generation from Zod schemas
- Server action integration out of the box
- Consistent styling via custom field components
- Used for: login, registration, profile editing, event creation

```tsx
// Standard form with remix-forms
import { SchemaForm } from "~/components/forms/base/schema-form"

<SchemaForm
  schema={loginSchema}
  fetcher={fetcher}
>
  {/* Fields auto-generated from schema */}
</SchemaForm>
```

### 2. React Hook Form (Advanced - Complex Interactions)

For forms requiring advanced UX patterns, we use **React Hook Form** directly:

- Auto-save on blur (admin tables, inline editing)
- Custom field interactions
- Complex validation timing
- Used for: admin data tables, auto-save forms, rules editor

```typescript
// Custom hook for auto-save pattern
const { register, values } = useAutoSaveForm({
  schema: profileSchema,
  fetcher,
  onSubmit: handleFieldSave,
})
```

### Shared Foundation

Both approaches share:

- **Zod schemas** for validation and type inference
- **Same validation on client and server**
- Integration with React Router actions/fetchers

## Consequences

### Positive

- Single source of truth for validation (Zod schema)
- Full type inference from schemas
- Consistent form UX via SchemaForm for standard cases
- Flexibility for complex cases via RHF
- Same schemas work on server for action validation

### Negative

- Two patterns to learn and maintain
- Must decide which approach to use for new forms
- Zod schemas can become verbose for complex forms

### Neutral

- Both coexist without conflict
- Compatible with any UI component library
- Can migrate between approaches if needs change

## When to Use Which

| Scenario | Approach |
|----------|----------|
| Standard form submission | remix-forms (SchemaForm) |
| Auto-save on blur | React Hook Form |
| Inline table editing | React Hook Form |
| Login/Register forms | remix-forms |
| Multi-step forms | remix-forms |
| Real-time validation | React Hook Form |

## Alternatives Considered

1. **Formik**
   - Pros: Popular, mature, good documentation
   - Cons: More re-renders, less TypeScript-native, heavier bundle

2. **React Final Form**
   - Pros: Subscription-based like RHF, flexible
   - Cons: Smaller ecosystem, less TypeScript support

3. **Native Forms with FormData Only**
   - Pros: Simple, works with progressive enhancement
   - Cons: No client-side validation, manual state management

4. **TanStack Form**
   - Pros: Modern, type-safe, framework-agnostic
   - Cons: Newer/less mature, smaller community

## References

- [remix-forms Documentation](https://remix-forms.seasoned.cc/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- Component location: `app/components/forms/`
- Related: [ADR: Use Composable Functions for Error Handling](./20250130-use-composable-functions-for-error-handling.md)

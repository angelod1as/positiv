# Use Composable Functions for Error Handling

- Status: accepted
- Date: 2025-01-30
- Tags: architecture, error-handling, typescript

## Context

Positiv needed a consistent way to handle errors across business logic, especially for:

- Form validation in React Router actions
- Database operations that might fail
- External API calls (email, Listmonk, etc.)
- Composing multiple operations that might independently fail

Traditional try-catch blocks scatter error handling and make it hard to compose operations safely.

## Decision

We use the `composable-functions` library for all business logic that might fail. Key functions used:

- **`composable(fn)`** - Wraps async functions to return `Result<T>` instead of throwing
- **`applySchema(schema)(fn)`** - Validates input with Zod before executing
- **`inputFromForm(request)`** - Parses FormData with proper typing

```typescript
import { applySchema, composable } from "composable-functions"

// Schema-validated function
export const updateProfile = applySchema(
  z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  })
)(async ({ id, name }) => {
  return await db
    .updateTable("profiles")
    .set({ name })
    .where("id", "=", id)
    .execute()
})

// In action handler
const result = await updateProfile(formData)
if (!result.success) {
  return json({ success: false, errors: result.errors })
}
```

## Consequences

### Positive

- Type-safe error handling with discriminated unions
- Errors are values, not exceptions (functional approach)
- Schema validation integrated into function definition
- Composable operations: `pipe`, `sequence`, `parallel`
- Consistent error structure across the application
- No forgotten try-catch blocks

### Negative

- Additional abstraction layer to learn
- Smaller community than mainstream error handling
- Result unpacking adds verbosity (`if (!result.success)`)
- Must remember to handle both success and failure cases

### Neutral

- Can still throw for truly exceptional cases
- Works alongside traditional try-catch where appropriate
- No runtime overhead beyond validation

## Alternatives Considered

1. **Traditional try-catch**
   - Pros: Standard JavaScript, no library needed
   - Cons: Easy to forget, doesn't compose, types don't track errors

2. **Custom Result type**
   - Pros: Full control, no dependencies
   - Cons: Reinventing the wheel, missing utilities

3. **neverthrow library**
   - Pros: Popular, Railway-oriented programming
   - Cons: Different API style, less form-focused

4. **Effect-TS**
   - Pros: Comprehensive, powerful
   - Cons: Very large learning curve, heavy

## References

- [composable-functions Documentation](https://github.com/seasonedcc/composable-functions)
- [Domain Functions (predecessor)](https://github.com/seasonedcc/domain-functions)
- Related: [ADR: Use React Hook Form + Remix Forms with Zod](./20250129-use-react-hook-form-and-remix-forms-with-zod.md)

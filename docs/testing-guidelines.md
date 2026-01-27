# Testing Guidelines

This document provides guidelines for writing effective tests in the Positiv project, based on lessons learned from our test cleanup initiative.

## Core Principles

### 1. Test Behavior, Not Implementation

**Good**: Tests that verify user-facing behavior and business logic
**Bad**: Tests that verify implementation details like CSS classes or internal structure

```tsx
// ❌ Bad: Testing implementation details
it("should apply primary variant class", () => {
  render(<Button variant="primary">Click me</Button>)
  expect(screen.getByRole("button")).toHaveClass("bg-primary")
})

// ✅ Good: Testing behavior
it("should call onClick handler when clicked", async () => {
  const handleClick = vi.fn()
  const user = userEvent.setup()
  render(<Button onClick={handleClick}>Click me</Button>)
  await user.click(screen.getByRole("button"))
  expect(handleClick).toHaveBeenCalledOnce()
})
```

### 2. Keep Tests Focused and Valuable

Ask: "If this test fails, does it indicate a real problem for users?"

**Keep tests that verify:**
- ✅ Event handler logic
- ✅ Complex conditional rendering
- ✅ State management
- ✅ User interactions (clicks, form inputs)
- ✅ Integration between components
- ✅ Business logic and calculations
- ✅ Data transformations
- ✅ Error handling

**Remove tests that only verify:**
- ❌ Component renders without crashing
- ❌ Text content appears
- ❌ CSS classes are applied
- ❌ Component accepts props
- ❌ Trivial conditional rendering (isActive ? "Active" : "Inactive")

### 3. Prefer Integration Tests Over Unit Tests

For complex workflows, integration tests provide more confidence than heavily mocked unit tests.

```tsx
// ❌ Bad: Over-mocked unit test
it("should process user data", () => {
  const mockDb = vi.fn().mockReturnValue({ id: 1 })
  const mockEmail = vi.fn()
  const mockLogger = vi.fn()

  processUser(mockDb, mockEmail, mockLogger)

  expect(mockDb).toHaveBeenCalled()
  expect(mockEmail).toHaveBeenCalled()
})

// ✅ Good: Integration test with real dependencies
it("should process user data end-to-end", async () => {
  const user = await createTestUser()
  const result = await processUser(user.id)

  expect(result.success).toBe(true)
  expect(result.emailSent).toBe(true)
})
```

## Component Testing

### When to Test Components

**Always test:**
- Components with complex user interactions
- Components with state management
- Form components with validation
- Components with business logic

**Rarely test:**
- Simple presentational components
- Components that only render props
- Wrapper components without logic

### Component Test Structure

Use descriptive nested `describe` blocks:

```tsx
describe("UserProfile", () => {
  describe("rendering", () => {
    it("should display user name and email", () => {
      // Test
    })
  })

  describe("interactions", () => {
    it("should open edit modal when edit button is clicked", async () => {
      // Test
    })
  })

  describe("validation", () => {
    it("should show error when email is invalid", async () => {
      // Test
    })
  })
})
```

### Avoid Redundant Variations

Don't test every possible variation of the same behavior:

```tsx
// ❌ Bad: Testing every variation separately
it("should render badge for 'Cis Woman'", () => { ... })
it("should render badge for 'cis woman'", () => { ... })
it("should render badge for 'CIS WOMAN'", () => { ... })

// ✅ Good: Test behavior comprehensively in one test
it("should render badge for gender identity (case-insensitive)", () => {
  const identities = ["Cis Woman", "cis woman", "CIS WOMAN"]
  identities.forEach(identity => {
    const { container } = render(<Badge gender={identity} />)
    expect(container.querySelector('[data-badge]')).toBeInTheDocument()
    cleanup()
  })
})
```

## Integration Testing

### File Organization

**Group related integration tests by feature, not by function:**

```
// ✅ Good: Feature-based organization
app/business/admin/dataviz/
  └── dataviz.integration.test.ts
      ├── Demographics DataViz
      ├── Event Metrics
      ├── Growth and Retention
      └── KPI Scores

// ❌ Bad: Function-based organization (creates many small files)
app/business/admin/dataviz/
  ├── demographics-dataviz.integration.test.ts
  ├── event-metrics.integration.test.ts
  ├── growth-retention.integration.test.ts
  └── kpi-scores.integration.test.ts
```

**Benefits:**
- Easier to find all tests for a feature
- Shared setup/teardown code
- Single test data prefix
- Reduced file count

### Shared Test Utilities

Create shared utilities for common patterns:

```tsx
// ✅ Good: Reusable test setup
const { tracker, kysely } = setupIntegrationTest()

beforeEach(async () => {
  tracker.clear()
  await kysely.deleteFrom("event_participants").execute()
})

afterEach(async () => {
  await cleanupAfterTest(tracker, kysely)
})
```

### Database Test Data

Use descriptive test data with unique identifiers:

```tsx
// ✅ Good: Clear test data with unique identifiers
const testPrefix = `dataviz-${Date.now()}`

const profile = await createTestProfile(tracker, kysely, {
  email: `${testPrefix}-veteran@test.com`,
  became_veteran_date: new Date("2024-01-01").toISOString(),
})
```

## Mocking Guidelines

### Mock External Dependencies Only

**Mock these:**
- ✅ External APIs (Listmonk, Supabase, AWS)
- ✅ Database in unit tests (not in integration tests)
- ✅ Time/Date functions when testing time-dependent logic
- ✅ File system operations
- ✅ Email sending services

**Don't mock these:**
- ❌ Internal modules/functions
- ❌ React/React Router components
- ❌ Utility functions
- ❌ Business logic

```tsx
// ❌ Bad: Mocking internal dependencies
const mockGetUser = vi.fn()
vi.mock("~/business/user", () => ({ getUser: mockGetUser }))

// ✅ Good: Only mock external API
const mockListmonk = vi.spyOn(listmonkClient, "addSubscriber")
mockListmonk.mockResolvedValue({ success: true })
```

## Test File Naming

Follow these conventions:

- **Unit tests**: `*.test.ts` or `*.test.tsx`
- **Integration tests**: `*.integration.test.ts`
- **E2E tests**: `*.spec.ts`

## Common Anti-Patterns

### 1. Hollow Test Files

**Problem**: Tests that mock everything and verify nothing real.

```tsx
// ❌ Bad: Hollow test
it("should transform data", () => {
  const mockData = { id: 1 }
  const mockTransform = vi.fn().mockReturnValue({ id: 1, name: "Test" })

  const result = mockTransform(mockData)

  expect(result).toEqual({ id: 1, name: "Test" })
})
```

**Solution**: Delete the test or test real behavior.

### 2. Trivial Rendering Tests

**Problem**: Tests that only verify React can render a component.

```tsx
// ❌ Bad: Trivial test
it("should render component", () => {
  render(<MyComponent />)
  expect(screen.getByText("Hello")).toBeInTheDocument()
})
```

**Solution**: Remove the test unless the component has complex conditional rendering logic.

### 3. Testing React Internals

**Problem**: Tests that verify React framework behavior, not your code.

```tsx
// ❌ Bad: Testing React
it("should accept children prop", () => {
  render(<Wrapper>Child content</Wrapper>)
  expect(screen.getByText("Child content")).toBeInTheDocument()
})
```

**Solution**: Remove the test. Trust React to handle props correctly.

### 4. Over-Specification

**Problem**: Tests that break when implementation changes, even though behavior is correct.

```tsx
// ❌ Bad: Over-specified test
it("should call helper function with exact arguments", () => {
  const helper = vi.fn()
  processData(helper)

  expect(helper).toHaveBeenCalledWith(
    expect.objectContaining({
      timestamp: "2024-01-01T00:00:00Z",
      format: "ISO",
      timezone: "UTC"
    })
  )
})

// ✅ Good: Test behavior outcome
it("should process data correctly", () => {
  const result = processData()
  expect(result.isValid).toBe(true)
  expect(result.timestamp).toBeDefined()
})
```

## Snapshot Testing

### When to Use Snapshots

**Good use cases:**
- Complex rendered output (charts, tables)
- Email templates
- Generated HTML/Markdown

**Bad use cases:**
- Simple components
- Dynamic content
- As a replacement for explicit assertions

```tsx
// ❌ Bad: Snapshot for simple component
it("renders button correctly", () => {
  const { container } = render(<Button>Click me</Button>)
  expect(container).toMatchSnapshot()
})

// ✅ Good: Snapshot for complex structure
it("renders email template with all sections", () => {
  const html = generateEventEmail(eventData)
  expect(html).toMatchSnapshot()
})
```

## Test Performance

### Keep Tests Fast

**Fast tests:**
- Mock external I/O (APIs, file system)
- Use in-memory database for integration tests
- Avoid unnecessary sleeps/waits
- Clean up test data efficiently

**Slow tests:**
- Real HTTP requests
- File system operations
- Long timeouts
- Complex setup/teardown

### Parallel Execution

Write tests that can run in parallel:

```tsx
// ✅ Good: Isolated test data
it("should process user", async () => {
  const testId = randomUUID()
  const user = await createTestUser({ id: testId })
  // Test uses isolated data
})

// ❌ Bad: Shared state
it("should process user", async () => {
  await createTestUser({ id: "test-user-1" }) // Conflicts in parallel
})
```

## TDD Workflow

Follow the Red-Green-Refactor cycle (as per CLAUDE.md):

1. **Red**: Write a failing test for the new behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Clean up code while keeping tests green

## Test Coverage Guidelines

### Coverage Targets

- **Minimum**: 70% overall coverage
- **Critical business logic**: 90%+ coverage
- **UI components**: Focus on behavior, not coverage percentage

### Coverage != Quality

**Remember:**
- 100% coverage doesn't mean good tests
- Focus on meaningful assertions
- One good test > five trivial tests

## Code Review Checklist

When reviewing test code, ask:

- [ ] Does this test verify user-facing behavior?
- [ ] Would a failure indicate a real problem?
- [ ] Is the test isolated and deterministic?
- [ ] Are mocks used appropriately (external dependencies only)?
- [ ] Is the test readable and maintainable?
- [ ] Does the test follow project conventions?
- [ ] Could this test be consolidated with others?

## Examples from Cleanup

### Before/After: Button Tests

**Before** (9 tests, 106 lines):
```tsx
it("should render button with primary variant", () => { ... })
it("should render button with secondary variant", () => { ... })
it("should render button with outline variant", () => { ... })
it("should render button with ghost variant", () => { ... })
it("should render button with default size", () => { ... })
it("should render button with sm size", () => { ... })
it("should render button with lg size", () => { ... })
it("should render button with icon size", () => { ... })
it("should handle onClick", () => { ... })
```

**After** (2 tests, 29 lines):
```tsx
it("should call onClick handler when clicked", () => { ... })
it("should render as child component when asChild is true", () => { ... })
```

**Why**: Removed CSS class tests, kept behavioral tests.

### Before/After: Badge Tests

**Before** (23 tests, 216 lines):
```tsx
it("should highlight 'Cis Woman'", () => { ... })
it("should highlight 'cis woman'", () => { ... })
it("should highlight 'CIS WOMAN'", () => { ... })
it("should highlight 'Trans Woman'", () => { ... })
it("should highlight 'trans woman'", () => { ... })
// ... 18 more similar tests
```

**After** (6 tests, ~70 lines):
```tsx
it("should highlight gender identities (case-insensitive)", () => {
  const identities = ["Cis Woman", "cis woman", "Trans Woman", ...]
  // Test all in one comprehensive test
})
```

**Why**: Consolidated redundant case variations into comprehensive tests.

## Further Reading

- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles/)
- [React Router Testing Best Practices](https://reactrouter.com/en/main/start/testing)
- [Vitest Best Practices](https://vitest.dev/guide/best-practices)

## Revision History

- **2026-01-27**: Initial version created during test cleanup initiative

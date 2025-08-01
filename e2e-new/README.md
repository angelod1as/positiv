# E2E Testing Guide

This guide explains our E2E testing philosophy and best practices for the Positiv project.

## Testing Philosophy

Our E2E tests prioritize **realistic user journeys** over isolated atomic tests. We compose tests that flow naturally from one state to another, reducing test execution time while maintaining reliability.

### Key Principles

1. **Sequential Flows Over Isolation**: When testing related features, combine them into logical user journeys
2. **Reliability First**: While we merge tests, each step must be reliable and properly handle timing/state
3. **Smart Test Organization**: Use Playwright's project configuration to separate concerns (authenticated vs unauthenticated)
4. **Avoid Redundancy**: Don't test the same functionality multiple times across different user types

## Directory Structure

```
e2e-new/
├── tests/
│   ├── unauthenticated/      # Tests that don't require login
│   │   ├── complete-journey.spec.ts
│   │   └── onboarding-flow.spec.ts
│   ├── authenticated/        # Tests requiring authentication
│   │   ├── user-access.spec.ts
│   │   └── admin-access.spec.ts
│   └── auth/                # Authentication setup
│       └── setup.ts
├── pages/                   # Page Object Models
│   ├── BasePage.ts         # Base page class
│   ├── LoginPage.ts        # Login page POM
│   └── RegisterPage.ts     # Registration page POM
├── fixtures/                # Reusable test utilities
│   ├── auth.ts             # Authentication helpers
│   ├── test-users.ts       # Test user configurations
│   ├── test-data.ts        # Shared test data
│   └── supabase-mock.ts    # Supabase mocking utilities
└── utils/                  # Test utilities
    └── db-cleanup.ts       # Database cleanup helpers
```

## When to Merge vs Separate Tests

### Merge Tests When

- Features naturally flow into each other (e.g., homepage → login → dashboard)
- Testing the same page with different validations (empty fields → invalid data → valid data)
- The combined flow represents a realistic user journey
- Setup/teardown overhead is significant

### Keep Tests Separate When

- Testing completely different user states (new user onboarding vs existing user)
- Features are unrelated and combining would create confusion
- Failure in one area shouldn't block testing of another
- Different authentication contexts are required

## Examples

### Good: Sequential Flow Test

```typescript
test('complete login flow from validation to logout', async ({ page }) => {
  // Test empty fields
  await submitButton.click()
  await expect(emailError).toBeVisible()
  
  // Test invalid credentials (reusing same form)
  await emailInput.fill('wrong@example.com')
  await passwordInput.fill('wrong')
  await submitButton.click()
  await expect(errorAlert).toBeVisible()
  
  // Test successful login (clearing and reusing form)
  await emailInput.clear()
  await passwordInput.clear()
  await emailInput.fill(validEmail)
  await passwordInput.fill(validPassword)
  await submitButton.click()
  await expect(page).toHaveURL('/dashboard')
  
  // Continue with session tests...
})
```

### Bad: Over-Isolated Tests

```typescript
// DON'T DO THIS - Too many separate tests for the same flow
test('login with empty email shows error', async ({ page }) => {
  // Full setup just to test one validation...
})

test('login with empty password shows error', async ({ page }) => {
  // Another full setup for similar validation...
})

test('login with invalid credentials shows error', async ({ page }) => {
  // Yet another full setup...
})
```

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e:new

# Run only unauthenticated tests
pnpm test:e2e:new -- --project=chromium

# Run only user authenticated tests  
pnpm test:e2e:new -- --project=chromium-authenticated-user

# Run only admin tests
pnpm test:e2e:new -- --project=chromium-authenticated-admin

# Run specific test file
pnpm test:e2e:new -- complete-journey

# Run in headed mode for debugging
pnpm test:e2e:new -- --headed

# Run with UI mode for interactive debugging
pnpm test:e2e:new -- --ui
```

## Best Practices

1. **Use Proper Waiting**: Always wait for navigation/network idle after actions

   ```typescript
   await Promise.all([
     page.waitForNavigation({ waitUntil: 'networkidle' }),
     submitButton.click()
   ])
   ```

2. **Flexible Assertions**: Use regex for URLs that might have query parameters

   ```typescript
   await expect(page).toHaveURL(/\/entrar/) // Not just '/entrar'
   ```

3. **Leverage Auth State**: Use Playwright's storage state to avoid re-login

   ```typescript
   test.use({ storageState: 'e2e-new/.auth/user.json' })
   ```

4. **Monitor Errors**: Track console errors throughout journeys

   ```typescript
   page.on('console', (msg) => {
     if (msg.type() === 'error') consoleErrors.push(msg.text())
   })
   ```

5. **Clear Test Data**: Use the provided cleanup utilities

   ```typescript
   await resetUserToDefaultState(testUser.email)
   ```

## Authentication Strategy

- **Setup Phase**: `auth/setup.ts` runs first to generate auth states
- **Storage States**: Saved to `.auth/` directory for reuse
- **User Types**:
  - Regular user: Can access dashboard, cannot see/access admin
  - Admin: Superset of user permissions + admin area access
- **Login Flow**: Identical for all users (test once, not per role)

## Adding New Tests

1. Determine if the test fits into an existing journey or needs its own
2. Place in appropriate directory (authenticated/unauthenticated)
3. Follow naming convention: `{feature}-{action}.spec.ts` or `{journey-name}.spec.ts`
4. Consider the authentication context needed
5. Update this README if adding new patterns or directories

### Page Object Model (POM)

All pages should extend `BasePage` and follow these patterns:
- Place in `pages/` directory
- Use descriptive locators with proper selectors
- Provide methods for common interactions
- Include verification methods for page state

Example:
```typescript
export class ExamplePage extends BasePage {
  readonly submitButton: Locator
  
  constructor(page: Page) {
    super(page)
    this.submitButton = page.getByRole('button', { name: 'Submit' })
  }
  
  async submit(): Promise<void> {
    await this.submitButton.click()
  }
}
```

Remember: The goal is to test like a real user would interact with the application, not to achieve 100% isolation at the cost of efficiency and realism.

# E2E Testing Guide

This guide explains our E2E testing philosophy and best practices for the Positiv project.

## Production Build Testing

**Important**: E2E tests run against a production build of the application, not the development server. This ensures we test what users actually experience and catch build-specific issues early.

### How It Works

1. **Build Phase**: The application is built using `pnpm build` before tests start
2. **Server**: A custom production server (`serve-production.ts`) handles the Vercel-preset build
3. **Port**: Each run is handed a free port starting at 5273, so a dev server on 5173 is never mistaken for the build under test
4. **Caching**: Build artifacts are cached locally for faster subsequent runs (disabled in CI)

### CI Compatibility

The setup automatically detects CI environments (`process.env.CI`) and:
- Forces a fresh build on every run
- Disables build caching
- Ensures all environment variables are available

In the pull request workflow the suite runs in two shards (`e2e-shard`), each
on its own runner with its own fresh database, and the integration suite runs
in a job of its own. `e2e-test`, the required check, passes only when all of
them do. Each shard uploads its report as `playwright-report-<shard>`.

## One Run At A Time

Every worktree shares one local Supabase instance and one machine, so runs must
not overlap. `pnpm test:e2e` goes through `scripts/with-db-lock.sh`, which waits
for its turn before starting anything. `pnpm test:integration` takes the same
lock, since it reads and writes the same database.

Both suites run in CI on every pull request, and pushing never takes the lock.
Run them locally only when the change reaches them — E2E when it touches
`e2e/`, integration when it touches a migration, an integration test or server
code that reaches the database (anything that queries through Kysely or
supabase-js). The lock is for those local runs.

**Always start the suite with `pnpm test:e2e`.** Calling `playwright test`
directly skips the lock, and two suites at once corrupt each other's data.

Waiting behind a full E2E run costs a few minutes. That is the price of the
data being trustworthy when the suite finally runs.

The lock lives in the shared git directory, so it is the same lock from every
worktree. While waiting, the script prints who holds it and for how long. It
reclaims a lock whose owner process is gone, and gives up after thirty minutes
rather than hanging forever.

### Run Scoping

The lock is the first line of defence, not the only one. Each run gets an id
(`E2E_RUN_ID`) that tags everything it creates:

- events are titled `[E2E:<runId>] ...`
- users carry `e2e_run_id` in their metadata and `test-<runId>-...@example.com`
  addresses

Teardown deletes only what carries its own id, so a run that escapes the lock
still cannot delete another's data. It also sweeps anything tagged as test data
older than an hour, which is how data from a crashed run gets collected.

When adding a fixture that creates events or users, build its titles and
addresses with the helpers in `utils/run-context.ts`. Anything named by hand
belongs to no run and will never be cleaned up.

## Testing Philosophy

One behaviour per test. A test says in its name what it proves, and when it
fails, that name is the behaviour that broke. A long journey stops at its first
failure and hides every step after it.

This used to read the other way: combine related features into journeys, to
save time. WEB-81 measured that in CI. A new test costs about 0.5 to 1 s
(a clean browser context and one page load), so splitting every long journey
would add 35 to 45 s to a suite of about five minutes. The real cost was
elsewhere: hooks waiting for things that never come, and running on one
machine.

### Key Principles

1. **The action under test goes through the screen.** Clicking, typing and
   reading the result is what an E2E test is for. Never replace it with an API
   call.
2. **Only the precondition takes a shortcut.** What has to exist before the
   action (an event, a participant, a payment already recorded) is created by
   API or database, through the same function the site uses to write it, so
   the row matches what the site writes. `recordManualPayment` in
   `utils/payment-helpers.ts` calls `registerManualPayment`, the function the
   admin's form calls.
3. **Every shortcut has its screen test.** If a test starts from a payment
   created by a helper, another test records a payment on screen.
4. **A few end-to-end journeys stay**, through the flows that handle money or
   access: sign-up → application → payment, and the admin approving and
   charging. They are the safety net for what breaks between screens. A
   journey is the exception, kept only when each step needs the one before.
   The ones that stay: the card and Pix payments in
   `admin-asaas-payment.spec.ts` and the charge paid after the switch goes off
   in `admin-online-payments-switch.spec.ts`, each walking a payment from the
   offer to the ledger.
5. **No waiting for what is not there.** Each test starts in a fresh browser
   context, already logged out or already logged in through its project's
   storage state. A hook that logs out "to be safe" waits for a timeout on
   every test.

## Directory Structure

```
e2e/
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

## Examples

### Good: One Behaviour Per Test

```typescript
test('wrong credentials are refused', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()

  await loginPage.emailInput.fill('wrong@example.com')
  await loginPage.passwordInput.fill('wrongpassword')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(loginPage.generalErrorAlert).toBeVisible()
})

test('admin refunds part of a payment', async ({ page }) => {
  // Precondition by shortcut: recording on screen has its own test.
  const { event, participant } = await participantWithPayment('Partial refund')
  const { modal } = await openPaymentModal(page, participant.socialName, event.id)

  // The action under test, on screen.
  await refund(page, modal, '50')

  await expect(modal.getByRole('row', { name: /pix/i })).toContainText('Reembolsado em parte')
})
```

### Bad: One Test Walking Several Behaviours

```typescript
// DON'T DO THIS - a failure at step 2 hides steps 3 to 6
test('complete login flow from validation to logout', async ({ page }) => {
  // empty fields → wrong credentials → login → admin refused → logout
})
```

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run only unauthenticated tests
pnpm test:e2e --project=chromium

# Run only user authenticated tests  
pnpm test:e2e --project=chromium-authenticated-user

# Run only admin tests
pnpm test:e2e --project=chromium-authenticated-admin

# Run specific test file
pnpm test:e2e complete-journey

# Run in headed mode for debugging
pnpm test:e2e --headed

# Run with UI mode for interactive debugging
pnpm test:e2e --ui
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
   test.use({ storageState: 'e2e/.auth/user.json' })
   ```

4. **Monitor Errors**: Track console errors throughout a test

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

1. Determine if the test fits into an existing spec or needs its own.
   Add the test to an existing spec that already walks the same page and fixtures, even
   when the ticket asks for a new one: every new spec adds setup time to a
   suite that holds the shared database lock. Add a spec only when folding the
   coverage in is impossible, and say why in the PR
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

# Positiv

This repository contains the software used by [Positiv](https://www.positivparty.com/), an 18+ event company that organizes gatherings for non-monogamous, LGBTQIA+, and queer individuals.

## About Positiv

Positiv aims to create safe and consensual environments for sexual exploration and connection, offering relaxed encounters—similar to picnics or barbecues among friends—where participants can be nude and engage in sexual activity without needing to hide. The company emphasizes safety, consent, and affection, providing welcoming spaces for people to explore their sexuality.

## About this repo

This software is an event management platform designed to streamline the process of organizing and managing events. The platform consists of two main interfaces:

1. **Client-facing Portal**: Allows users to apply to events, check their application status, and receive reminders for upcoming events.
2. **Admin Dashboard**: Provides comprehensive functionality for event and participant management.

## Features

### Client Portal

- Event application submission
- Application status tracking
- Event reminders
- User profile management

### Admin Dashboard

- Event creation and management
- Participant approval and management
- Event status updates
- Data export capabilities

## Technology Stack

Positiv is built using modern web technologies:

Here are the links for each of the technologies:

- **Frontend**: [React 19](https://react.dev/versions), [React Router 7](https://reactrouter.com/)
- **Backend**: [Supabase](https://supabase.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Testing**: [Playwright](https://playwright.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Form Handling**: [Remix Forms](https://remix-forms.seasoned.cc/), [React Hook Form](https://react-hook-form.com/) with [Zod validation](https://zod.dev/)
- **Database Access**: [Kysely](https://kysely.dev/)
- **Email**: [Nodemailer](https://nodemailer.com/) with [AWS SES](https://aws.amazon.com/ses/)
- **Other Notable Libraries**: [Composable Functions](https://github.com/seasonedcc/composable-functions), [PrimeReact](https://primereact.org/), [ShadCN](https://ui.shadcn.com/), [React Email](https://react.email/), [Mailhog](https://github.com/mailhog/MailHog).

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- pnpm package manager
- Supabase account and project (see the [Setting Up Local Supabase](#setting-up-local-supabase) chapter)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/angelod1as/positiv.git
   cd positiv
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Install supporting applications

   - [Docker](https://www.docker.com/)
   - [Mailhog](https://github.com/mailhog/MailHog)
   - [Positiv Email](https://github.com/angelod1as/positiv-email) (When developing admin emails)

4. Setup the [local supabase](#setting-up-local-supabase) installation.

5. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your local Supabase credentials and other required variables. Open an issue if you need any specific variable.

6. Start the development server:

   ```bash
   pnpm dev
   ```

## Development

### Available Scripts

The most important scripts for development are:

- `pnpm dev` - Start the development server
- `pnpm lint` - Run linting checks
- `pnpm test` - Run Playwright tests

### Additional scripts

- `pnpm db:types` - Generate database types — add `--local` to generate from the local Supabase instance.
- `pnpm email:test` - Runs Mailhog

### Setting Up Local Supabase

To run Supabase locally, you'll need [Docker](https://www.docker.com/products/docker-desktop/) installed and running on your machine, as Supabase utilizes Docker containers for its local services.

1. **Install Supabase CLI:** Ensure you have the Supabase CLI installed. Follow the [official installation guide](https://supabase.com/docs/guides/local-development/cli/getting-started).
2. **Initialize and Start Local Services:** In your project directory, initialize Supabase by running `supabase init`. Then, start the local Supabase services with `supabase start`.
3. Run `supabase db reset` so the migrations and seeds can be applied.
4. Run `supabase status` and add the information to the `.env` file.

## Testing

The project uses various testing frameworks:

### Unit and Integration Tests

```bash
pnpm test         # Run unit tests with Vitest
pnpm test:integration  # Run integration tests (requires database)
pnpm test:ui      # Run tests with Vitest UI
pnpm test:coverage # Run tests with coverage report
```

### E2E Tests

The project uses Playwright for end-to-end testing against a production build:

```bash
pnpm test:e2e     # Run all E2E tests
pnpm test:e2e:ui  # Run E2E tests with interactive UI
```

E2E tests are organized by authentication state:
- Unauthenticated tests: Test public pages and authentication flows
- Authenticated user tests: Test user dashboard and features
- Authenticated admin tests: Test admin functionality

Tests run sequentially for reliability and follow realistic user journeys.

## Email template development

1. Clone [Positiv Email](https://github.com/angelod1as/positiv-email)
2. The repositories must be siblings `./positiv` and `./positiv-email` must be in the same folder (or you will need to edit the Positiv Email files)
3. Follow its Readme for running the server

## Deployment

The application can be deployed to any hosting service that supports Node.js applications. Follow these steps for deployment:

1. Build the application:

   ```bash
   pnpm build
   ```

2. Start the server:

   ```bash
   pnpm start
   ```

## Project Structure

- `/app` - Main application code
  - `/assets` - Static assets
  - `/business` - Business logic
  - `/components` - React components
  - `/hooks` - Custom React hooks
  - `/lib` - Utility functions and libraries
  - `/pages` - Application pages
  - `/types` - TypeScript type definitions
- `/e2e` - End-to-end tests
- `/supabase` - Supabase migrations and seeds
- `/public` - Public assets

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the Creative Commons Attribution-NonCommercial License - see the [LICENSE](LICENSE) file for details.

## Architectural Decision Records

We use [Log4Brains](https://github.com/thomvaill/log4brains) to manage our ADRs. Check our [Decisions](./docs/architecture/decisions/index.md) folder or:

1. Install Log4Brains: `pnpm install -g log4brains`
2. Run `log4brains preview`
3. Read the docs

We recommend new ADRs for every big decision — vague, right? The maintainer can ask for an ADR in any PR.

To add a new ADR: `log4brains adr new`.

## Notes from the Author

[Angelo Dias](https://www.angelodias.com.br) built this software _almost_ entirely by hand.

The development wouldn't have been possible without the help of friends like Julia (my business partner), Wander, Chalom, Leo, Nica, and other beautiful people — that tested the software both before launch and during its existence.

### About AI usage

This project **uses AI** for coding help, writing docs, and PR reviews. My opinion on AI is negative and [pretty public](https://www.cronofobia.com/p/ai-art-will-take-your-job) (this is about AI art but you can get the gist of it), but as a solo developer of a project of this scope, I had not many choices. Criticise openly — if you end up opening a PR. If not, criticise privately at the comfort of your home.

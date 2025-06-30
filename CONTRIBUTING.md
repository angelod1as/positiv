# Contributing to Positiv

Thank you for considering contributing to Positiv! This document outlines the process for contributing to the project and helps to make the contribution process easy and effective for everyone involved.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and considerate of others when contributing.

## Getting Started

### Prerequisites

- Node.js (latest LTS version)
- pnpm package manager
- Supabase account for local development
- Basic knowledge of React, TypeScript, and Supabase

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/YOUR-USERNAME/positiv.git
   cd positiv
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your Supabase credentials and other required variables.
5. Generate database types:

   ```bash
   pnpm db:types
   ```

6. Start the development server:

   ```bash
   pnpm dev
   ```

## How to Contribute

### Reporting Bugs

Before submitting a bug report:

1. Check the issue tracker to see if the bug has already been reported
2. Update your code to the latest version to see if the issue has been fixed

When submitting a bug report, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Your environment details (OS, browser, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! When submitting an enhancement suggestion, please include:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Any potential implementation details
- Why this enhancement would be useful to most users

### Pull Requests

1. Create a new branch for your feature or bugfix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

   or

   ```bash
   git checkout -b fix/your-bugfix-name
   ```

2. Make your changes, following the code style guidelines

3. Add tests for your changes if applicable

4. Run the test suite to ensure all tests pass:

   ```bash
   pnpm test
   ```

5. Commit your changes using a descriptive commit message:

   ```bash
   git commit -m "Add feature: your feature description"
   ```

6. Push your branch to GitHub:

   ```bash
   git push origin feature/your-feature-name
   ```

7. Submit a pull request to the main repository

### Pull Request Review Process

1. At least one project maintainer will review your pull request
2. The reviewer may request changes or improvements
3. Once approved, a maintainer will merge your pull request

## Code Style Guidelines

### TypeScript

- Follow the TypeScript best practices
- Use proper typing; `any` type is forbidden.
- Use types for object shapes
- Use meaningful variable and function names

### React

- Use functional components with hooks
- Keep components small and focused on a single responsibility
- Use proper prop types
- Follow the React best practices

### CSS/Styling

- Use Tailwind CSS utility classes
- Follow the project's existing styling patterns
- Keep styles modular and reusable

### Testing

- Write E2E tests for new features and bug fixes
- Ensure all tests pass before submitting a pull request
- Follow the existing testing patterns

## Git Workflow

- Keep your commits small and focused
- Write clear and descriptive commit messages
- Rebase your branch on the latest main before submitting a pull request
- Squash multiple commits into logical units

## Documentation

- Update documentation when changing functionality
- Document new features
- Keep the README and other documentation up to date

## Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Router Documentation](https://reactrouter.com/en/main)

Thank you for contributing to Positiv!

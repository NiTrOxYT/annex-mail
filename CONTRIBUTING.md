# Contributing to Annex Mail

Thank you for contributing to Annex Mail. This guide describes the workflow, coding standards, and pre-commit checks.

## Development Workflow

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure you copy `.env.example` to `.env` and set active credentials.

3. Boot the local development server:
   ```bash
   npm run dev
   ```

## Code Quality Standards

Annex Mail uses:
- Prettier for formatting.
- ESLint for linting.
- TypeScript compiler for type checks.
- Husky + lint-staged to run pre-commit tests.

### Running Quality Checks Manually

Before staging changes, run the verification scripts:

- Check syntax lint:
  ```bash
  npm run lint
  ```

- Verify Prettier formatting:
  ```bash
  npm run format
  ```

- Run strict TypeScript type compiler:
  ```bash
  npm run typecheck
  ```

- Verify the Next.js bundle compiles cleanly:
  ```bash
  npm run build
  ```

## Formatting Guidelines
- Double quotes for JSX, single/double quotes for code consistently.
- Ensure all custom form elements are wrapped in standard `Field` structures with clean labels and helper text.
- Never write direct Prisma queries in UI code (always route database access through the Repository layer).

# Annex Mail

Annex Mail is a production-grade self-hosted business email platform built with Next.js 15, React 19, Auth.js, and Prisma.

It facilitates shared team collaboration on top of a single central mailbox. It intercepts client emails, forwards them via Cloudflare Routing, syncs with Gmail API (Phase 2), and sends responses via Brevo API (Phase 2), presenting a unified professional sender profile (`business@annex-consultancy.com`).

## Phase 1 Deliverables
- **Next.js 15 Project Setup**: Scaffolding with TypeScript, Tailwind CSS v4, and ESLint.
- **Database Schema (Prisma 7)**: Configured models (`User`, `Organization`, `Member`, `Session`, `VerificationToken`) with PostgreSQL (Supabase support).
- **Authentication (Auth.js v5)**: Fully functional credentials login (Email + Password) with secure bcrypt validation and edge-compatible middleware routing guards.
- **Repository & Service Pattern**: Isolated data access layers (`UserRepository`, `OrgRepository`) and service logic (`UserService`) to decouple logic from the view.
- **Dynamic Configuration (Zod)**: Strongly-typed environment checking (auth, email, database, app).
- **Central Logger**: Console-based auditing supporting structured tags (`LOGIN_SUCCESS`, `LOGIN_FAILED`, etc.) ready for DB storage.
- **Email Interface**: Abstract `EmailProvider` with mock fallback for testing mail flows in development.
- **Modern Shell Layout**: Sleek, responsive sidebar layout matching premium product designs, containing placeholders for the inbox, sent items, templates, logs, and settings.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Setup the database (Ensure Postgres is active or set `DATABASE_URL`):
   ```bash
   npx prisma migrate dev
   ```

4. Boot the development server:
   ```bash
   npm run dev
   ```

## Development and Quality Tooling
Verify syntax, formatting, types, and build:
```bash
npm run lint       # Lint verification
npm run format     # Prettier formatting
npm run typecheck  # TypeScript validation
npm run build      # Verify compilation
```

Pre-commit hooks are configured to automate these validations on changes using Husky and lint-staged.

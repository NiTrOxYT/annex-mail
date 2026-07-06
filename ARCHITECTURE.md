# Annex Mail — System Architecture

This document describes the design patterns, layer abstraction, and folder structure implemented in Annex Mail.

## Tech Stack
- Next.js 15 (App Router, Server Components)
- React 19
- TypeScript (Strict mode)
- TailwindCSS v4
- shadcn/ui (Base primitives)
- Prisma 7 (with PostgreSQL PG adapter)
- Auth.js v5 (NextAuth Credentials flow)
- Zod

## Design Principles & Patterns

### 1. Repository Pattern
To maintain a clean separation of concerns, the database is never queried directly inside UI components or route handlers. Instead, all Prisma interactions are encapsulated within Repository classes (`src/repositories/`).
- `UserRepository`: User retrieval, creation, and updates.
- `OrgRepository`: Organization settings, members list, role changes.

### 2. Service Layer
Business logic, such as password hashing, role permissions verification, and workspace assignment, is isolated in Service classes (`src/services/`).
- `UserService`: Credentials validation, new user registration.

### 3. Dependency Injection (DI) Container
To decouple modules and promote easy unit testing, the platform utilizes a type-safe dynamic dependency injection container (`src/lib/di/`).
- Core services, repositories, cache managers, and storage engines are registered during application startup inside `src/instrumentation.ts`.
- Future modules resolve their requirements from the `container` registry instead of importing concrete singletons.

### 4. Event Bus (Decoupled Communications)
An internal event-driven message bus (`src/lib/events/`) enables components to communicate asynchronously without direct imports or dependency chains.
- Dispatched events (e.g. `USER_CREATED`, `USER_LOGGED_IN`) are handled concurrently by registered observers.

### 5. Permission & Access Management
To replace fragile role-checking conditions (e.g. `role === "OWNER"`), we implement a fine-grained permission-based framework (`src/lib/auth/permissions.ts`).
- Interactive triggers check specific system privileges (e.g. `mail.send`, `settings.manage`) mapped through configurable role policy schemas.

### 6. Caching & Storage Providers
Core services interact with cached parameters and file assets via abstract interface signatures (`CacheProvider` and `StorageProvider`).
- Out-of-the-box local storage handles file persistence inside a secure, private root directory (`.uploads`), ready to be swapped with S3 or Cloudflare R2 engines.
- In-memory cache handles temporary validation tokens and settings variables.

### 7. Centralized Logging & Audit Trail
Logging is split into two pathways:
- **Central Logger**: Console logging utilizing level checks (`info`, `warn`, `error`) and tag grouping.
- **Audit Service**: Segregates developer/security audit entries (machine-readable, payload metadata, IP, user context) from human-readable activity statements (user-facing actions log).

## Directory Structure
Detailed file organization guidelines are documented inside `docs/FOLDER_STRUCTURE.md`.
Conventions, conventions, formatting, and standard validations are detailed inside `docs/CONVENTIONS.md`.
API standard formats and error checks are mapped in `docs/API_GUIDELINES.md`.
Security checks and policies reside inside `docs/SECURITY.md`.

# Annex Mail — Directory & Folder Structure

This document outlines the organization and directory layouts of the Annex Mail platform, designed for feature encapsulation and backend system independence.

## Root Directory Maps

```
├── docs/                        # Global system architectural guides
├── prisma/                      # Prisma 7 DB schema, settings and migration files
├── public/                      # Static static asset assets (images, web manifests)
└── src/
    ├── app/                     # Next.js App Router layouts, page definitions and API routes
    ├── components/              # Atomic UI elements and shell layout controls
    │   ├── providers/           # Client-side state context providers (Auth, Theme)
    │   └── ui/                  # Component library primitives (button, dialog, card, etc.)
    ├── config/                  # Validated settings services (auth, email, database, app, security, storage)
    ├── features/                # Feature-scoped modules (auth, dashboard, inbox, mail, settings, users)
    ├── lib/                     # Decoupled utility singletons and service drivers
    │   ├── audit/               # Activity and Security log brokers
    │   ├── auth/                # Auth.js configurations and permission checking middleware
    │   ├── cache/               # Caching abstraction providers
    │   ├── db/                  # Singleton database connector initializer
    │   ├── di/                  # Lightweight Dependency Injection IoC container
    │   ├── events/              # Internal event bus broadcasters
    │   ├── logger/              # Centralized logging service
    │   └── storage/             # File storage abstraction providers
    ├── repositories/            # Database abstraction and CRUD operation classes
    ├── services/                # Business and domain verification logic classes
    ├── types/                   # Type definitions and module augmentations
    ├── utils/                   # Shared pure helper utilities (api wrappers, date formatters, pagination parameters)
    └── validators/              # Common Zod request inputs validation configurations
```

### Module Isolation Guidelines
1. **Core Utilities vs Views**: Never write direct file accesses (`fs`), network requests, database transactions, or configuration checks (`process.env`) directly within React UI Components or Next.js layout views. Decouple them to services/repositories and resolve them via the DI Container.
2. **Feature Folders (`src/features/`)**: Scoped feature views, state stores (Zustand), and nested helper components should remain inside their respective directories under `src/features/`.

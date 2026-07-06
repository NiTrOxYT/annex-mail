# Annex Mail — Coding & Conventions Guide

This document outlines the coding standards, patterns, and style conventions to adhere to when contributing to Annex Mail.

## General Principles

1. **Strict TypeScript Compliance**
   - Explicitly type all variables, function arguments, and return values.
   - Avoid `any` typing under all circumstances (use `unknown` or custom interfaces if types are dynamic).
   - Augmented files (like `next-auth.d.ts`) must be used for expanding framework module properties.

2. **Decoupled Architecture (SOLID)**
   - Single Responsibility: Keep services focused on business logic and repositories focused on database access.
   - Dependency Inversion: Depend on interfaces instead of concrete implementations where possible (e.g. `StorageProvider`, `EmailProvider`). Resolve dependencies through the DI `container`.

3. **Result Pattern for Domain Flow**
   - Business services should return a `Result<T, E>` object representing either `Success` or `Failure`.
   - Avoid throwing raw exceptions for normal validation flows. Reserve throwing errors for catastrophic unexpected failures (database down, network timeout).

## Spacing & Code Formatting
- Code indentation must be set to 2 spaces.
- Double quotes for JSX components (`className="px-4"`) and consistent single/double quotes in typescript source.
- Prefer clean, semantic HTML tag markers (`main`, `header`, `section`, `nav`).
- Use the `cn()` merge helper when dynamically overriding Tailwind CSS layout arguments on components.

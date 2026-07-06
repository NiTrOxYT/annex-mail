# Annex Mail — Security & Policies Guide

This document describes the security configurations, validation policies, and defensive frameworks integrated inside the Annex Mail codebase.

## Authentication & Authorization

1. **Auth.js Session Guards**
   - Middleware handles route authorization matching sessions before hits.
   - JWT tokens carry user role (`OWNER`, `ADMIN`, `EMPLOYEE`, `READONLY`) and organization id.

2. **Permission Checks**
   - Direct role queries inside features are discouraged.
   - Use `PermissionChecker.hasPermission(role, permission)` to enforce permissions based on ROLE_POLICIES.

## Data Validation & Defense

1. **Input Sanitization (Zod)**
   - API endpoints pass payloads through Zod schemas.
   - Email format checking, password complexity constraints, and alphanumeric slugs prevent common insertion vulnerabilities.

2. **Storage Isolation**
   - Local uploads are written to a private root-level folder (`.uploads`).
   - Access to user attachments requires authorized session tokens; files are streamed from storage through a proxy handler.

3. **CORS & Rate Limiting**
   - Session policy, rate limits, and CORS origins configurations are managed in `src/config/security.ts`.
   - Ensure rate limit parameters are active on all public API routes (e.g. login endpoints).

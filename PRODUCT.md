# Product

## Register

product

## Users
Annex Consultancy internal team (Owner, Admin, Employees). They manage client communications, handle business inquiries, send professional emails, and collaborate on responses. They need a fast, reliable, shared business mailbox that doesn't require expensive Google Workspace seats.

## Product Purpose
Annex Mail is a self-hosted business email platform that coordinates incoming email (via Cloudflare routing to a central Gmail inbox) and outgoing email (via Brevo SMTP/API), showing a unified sender address (business@annex-consultancy.com) to clients. It allows multiple team members to access, read, and write emails from a single custom dashboard without exposing the underlying credentials or inbox directly.

## Brand Personality
- Clean, minimal, utility-focused.
- 3-word personality: Professional, Direct, High-fidelity.
- Emotional goals: Security, confidence, speed.

## Anti-references
- Cluttered corporate dashboards with excessive charts, cards-inside-cards, and visual noise.
- Generic "AI platform" aesthetics with neon-purple gradients and over-rounded borders.
- Slow, janky single-page email clients.

## Design Principles
1. **Utility First**: Design for reading and writing text. Spacing and typography hierarchy are the primary visual interfaces.
2. **Modular Architecture**: Separate UI components from backend services and database operations using repository and service classes.
3. **No Fluff**: Focus on performance and responsiveness. Page transitions, dialogs, and states must load instantly and with tactile feel.

## Accessibility & Inclusion
- WCAG 2.1 AA compliant contrast ratios (minimum 4.5:1 for body copy).
- Support for keyboard navigation and screen readers on all custom UI components.
- Honor user preferences for reduced motion (`prefers-reduced-motion: reduce`).

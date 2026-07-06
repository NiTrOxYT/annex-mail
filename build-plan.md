BUILD_PLAN.md

Annex Mail Development Roadmap

⸻

Phase 1 — Infrastructure

Goal

Prepare the email infrastructure.

Tasks

* Configure Cloudflare Email Routing
* Create business@annex-consultancy.com
* Forward to Gmail
* Configure Gmail API
* Create Google OAuth credentials
* Configure Brevo
* Verify domain in Brevo
* Configure SPF
* Configure DKIM
* Configure DMARC

Deliverable

Professional email works end-to-end.

⸻

Phase 2 — Project Setup

Tasks

* Create Next.js project
* Configure TypeScript
* Install Tailwind
* Install shadcn/ui
* Configure Prisma
* Connect PostgreSQL
* Configure environment variables

Deliverable

Project ready for development.

⸻

Phase 3 — Authentication

Tasks

* Login
* User roles
* Session handling
* Protected routes

Deliverable

Secure authentication system.

⸻

Phase 4 — Gmail Synchronization

Tasks

* Connect Gmail API
* Import inbox
* Import sent mail
* Store conversation IDs
* Store message IDs
* Sync attachments
* Sync labels

Deliverable

Dashboard mirrors the Gmail mailbox.

⸻

Phase 5 — Inbox UI

Tasks

* Sidebar
* Mail list
* Search
* Filters
* Pagination
* Read/unread
* Archive
* Delete

Deliverable

Functional inbox experience.

⸻

Phase 6 — Conversation View

Tasks

* Threaded conversations
* Attachments
* Inline images
* Reply
* Reply all
* Forward

Deliverable

Complete email thread interface.

⸻

Phase 7 — Email Composer

Tasks

* To
* CC
* BCC
* Subject
* Rich text editor
* Attachments
* Drafts
* Send

Deliverable

Full-featured email composer.

⸻

Phase 8 — Brevo Integration

Tasks

* Send via API
* Custom sender name
* Custom reply address
* HTML support
* Attachments
* Custom headers (Message-ID, In-Reply-To, References)

Deliverable

Clients receive emails from:

Annex <business@annex-consultancy.com>

Replies remain in the same conversation.

⸻

Phase 9 — Templates

Tasks

* Create templates
* Edit templates
* Variables
* Preview

Deliverable

One-click reusable emails.

⸻

Phase 10 — Team Collaboration

Tasks

* User management
* Assign conversations
* Internal notes
* Activity logs
* Status indicators

Deliverable

Shared inbox for the entire team.

⸻

Phase 11 — Dashboard

Widgets

* Inbox count
* Sent today
* Pending replies
* Unread
* Assigned to me
* Recent activity

Deliverable

Operational overview.

⸻

Phase 12 — Search

Features

* Full-text search
* Sender
* Subject
* Company
* Date
* Attachments

Deliverable

Fast email discovery.

⸻

Phase 13 — Notifications

Tasks

* New email
* New assignment
* Replies
* Browser notifications
* Real-time updates

Deliverable

Responsive team workflow.

⸻

Phase 14 — Security

Tasks

* Audit logs
* Rate limiting
* Session expiry
* File validation
* Permissions
* Backup strategy

Deliverable

Production-ready security.

⸻

Phase 15 — AI Features (Future)

* AI reply suggestions
* Email summarization
* Tone adjustment
* Translation
* Smart search
* Auto-labeling
* Follow-up reminders

⸻

Version 1.0 Scope

* Shared inbox
* Gmail synchronization
* Brevo sending
* Conversation threading
* Drafts
* Templates
* Team accounts
* Attachments
* Search
* Notifications

⸻

Version 2.0 Scope

* AI assistant
* CRM integration
* Calendar
* Tasks
* Client profiles
* Analytics
* Multiple domains
* Mobile app

⸻

Success Criteria

* All incoming mail reaches Gmail through Cloudflare Email Routing.
* The dashboard stays synchronized with Gmail.
* All outgoing mail is sent through Brevo as Annex <business@annex-consultancy.com>.
* Replies preserve the original conversation thread.
* Team members collaborate from a single shared dashboard without exposing the underlying Gmail account.
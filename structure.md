structure.md

Annex Mail

A self-hosted business email dashboard for Annex Consultancy.

⸻

Objective

Provide a professional email experience without paying for Google Workspace.

The system should:

* Receive emails sent to business@annex-consultancy.com
* Forward all incoming emails to Gmail using Cloudflare Email Routing
* Sync emails from Gmail
* Allow the team to send emails from a custom dashboard
* Send emails using Brevo
* Ensure clients only ever see:

Annex <business@annex-consultancy.com>

⸻

Architecture

Internet
        │
        ▼
business@annex-consultancy.com
        │
Cloudflare Email Routing
        │
        ▼
Annex Gmail Inbox
        │
        ▼
 Gmail API
        │
        ▼
Annex Mail Backend
        │
 ┌──────┴─────────┐
 │                │
 ▼                ▼
Database      Brevo API
 │                │
 └──────┬─────────┘
        ▼
Frontend Dashboard

⸻

Tech Stack

Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* React Hook Form
* TanStack Query

⸻

Backend

* Next.js API Routes
* Gmail API
* Brevo API
* Prisma ORM

⸻

Database

PostgreSQL

Tables

* users
* email_accounts
* conversations
* messages
* drafts
* templates
* attachments
* labels
* audit_logs

⸻

Folder Structure

annex-mail/
app/
    dashboard/
    inbox/
    sent/
    drafts/
    templates/
    settings/
components/
lib/
    gmail/
    brevo/
    auth/
    db/
server/
prisma/
public/
types/
hooks/
utils/

⸻

Authentication

Roles

* Owner
* Admin
* Employee

Permissions

Owner

* Everything

Admin

* Manage emails
* Templates
* Users

Employee

* Read inbox
* Reply
* Send emails

⸻

Core Modules

Inbox

Features

* Inbox
* Sent
* Drafts
* Spam
* Trash
* Archive

⸻

Conversation View

Each conversation contains

* Messages
* Attachments
* Sender
* Time
* Thread ID
* Status

⸻

Composer

Fields

* To
* CC
* BCC
* Subject
* Rich Text Body
* Attachments

Buttons

* Send
* Save Draft
* Schedule

⸻

Templates

Store reusable templates

Examples

* Welcome
* Quotation
* Invoice
* Follow Up
* Thank You

⸻

Signatures

Each user can have

Regards,
Annex
Business Development
business@annex-consultancy.com

⸻

Search

Search by

* Sender
* Subject
* Company
* Date
* Attachment
* Content

⸻

Notifications

Real-time

* New mail
* Reply received
* Assignment
* Mention

⸻

Attachments

Support

* Images
* PDF
* DOCX
* ZIP

⸻

Team Management

Owner can

* Invite users
* Remove users
* Reset password
* Change role

⸻

Future Features

* AI email writing
* AI summarization
* Auto categorization
* Internal notes
* Shared inbox
* CRM integration
* Calendar
* Task management
* Scheduled sending
* Email analytics
* Read receipts
* Multi-domain support

⸻

Security

* JWT Authentication
* Refresh Tokens
* Role Based Access
* Audit Logs
* Rate Limiting
* Encryption
* Secure File Uploads

⸻

Goal

A clean, fast and modern business email platform where the team collaborates while every client only communicates with:

Annex <business@annex-consultancy.com>
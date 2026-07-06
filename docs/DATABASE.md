# Database Schema & Performance — Annex Mail

Annex Mail tables, relationship mapping, and index details.

---

## 1. Schema Diagram overview

```
User ──< Member >── Organization
                       │
                       ├──< EmailAccount (decrypted via AES-256)
                       │       │
                       │       ├─── WatchState (Pub/Sub session state)
                       │       └─── SyncState (lastSync checkpoints)
                       │
                       └──< Conversation
                               │
                               └─── Message (headers JSON, body, metadata)
                                       │
                                       ├─── Attachment (mimeType, size, path)
                                       └─── MessageLabel (tag mapping)
```

---

## 2. Production Indexes

The following indices are configured in `prisma/schema.prisma` to optimize query latency under load:

| Model | Index fields | Purpose |
|---|---|---|
| `Conversation` | `[organizationId, status, lastMessageAt]` | High performance cursor-pagination listing. |
| `Conversation` | `[accountId]` | Fast retrieval of account-scoped mail folders. |
| `Message` | `[conversationId, internalDate]` | Speeds up timeline message list queries. |
| `Message` | `[providerMessageId]` | Sync de-duplication lookup speed. |
| `Message` | `[internetMessageId]` | Sync de-duplication lookup speed. |
| `Message` | `[sentByUserId]` | Audit filters mapping sent mails to users. |
| `Attachment` | `[messageId]` | Fast loading of attachment lists in timeline. |
| `Label` | `[organizationId]` | Folder lists for layout rendering. |
| `Draft` | `[organizationId, userId]` | Quick access to organization draft collections. |
| `Template` | `[organizationId]` | Custom corporate response template filters. |
| `JobRecord` | `[status]`, `[name, status]` | Job executor scans for queued background actions. |
| `Member` | `[userId]` | Checking user membership permissions. |
| `Session` | `[userId]` | NextAuth session validity joins. |

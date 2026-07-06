-- =============================================================================
-- Annex Mail — Production Database Bootstrap
-- =============================================================================
-- Generated from: prisma/schema.prisma
-- Target: Supabase PostgreSQL
--
-- Safe to execute on a new Supabase project.
-- Idempotent: uses IF NOT EXISTS throughout.
-- No mock data. No test data. No destructive operations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- pgcrypto: required for gen_random_bytes (CUID generation support)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'EMPLOYEE', 'READONLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'ARCHIVED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- ── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "users" (
  "id"           TEXT        NOT NULL,
  "name"         TEXT,
  "email"        TEXT        NOT NULL,
  "passwordHash" TEXT,
  "avatar"       TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key"
  ON "users" ("email");

-- ── organizations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "organizations" (
  "id"        TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "slug"      TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key"
  ON "organizations" ("slug");

-- ── members ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "members" (
  "id"             TEXT   NOT NULL,
  "role"           "Role" NOT NULL DEFAULT 'EMPLOYEE',
  "organizationId" TEXT   NOT NULL,
  "userId"         TEXT   NOT NULL,

  CONSTRAINT "members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "members_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "members_organizationId_userId_key"
  ON "members" ("organizationId", "userId");

CREATE INDEX IF NOT EXISTS "members_userId_idx"
  ON "members" ("userId");

-- ── sessions ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "sessions" (
  "id"           TEXT        NOT NULL,
  "sessionToken" TEXT        NOT NULL,
  "userId"       TEXT        NOT NULL,
  "expires"      TIMESTAMPTZ NOT NULL,

  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key"
  ON "sessions" ("sessionToken");

CREATE INDEX IF NOT EXISTS "sessions_userId_idx"
  ON "sessions" ("userId");

-- ── verification_tokens ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "id"         TEXT        NOT NULL,
  "identifier" TEXT        NOT NULL,
  "token"      TEXT        NOT NULL,
  "expires"    TIMESTAMPTZ NOT NULL,

  CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key"
  ON "verification_tokens" ("token");

CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key"
  ON "verification_tokens" ("identifier", "token");

-- ── email_accounts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "email_accounts" (
  "id"                    TEXT        NOT NULL,
  "organizationId"        TEXT        NOT NULL,
  "provider"              TEXT        NOT NULL,
  "displayName"           TEXT        NOT NULL,
  "email"                 TEXT        NOT NULL,
  "encryptedAccessToken"  TEXT,
  "encryptedRefreshToken" TEXT,
  "expiresAt"             TIMESTAMPTZ,
  "status"                TEXT        NOT NULL DEFAULT 'ACTIVE',
  "isPrimary"             BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL,

  CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_accounts_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_accounts_email_key"
  ON "email_accounts" ("email");

-- ── watch_states ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "watch_states" (
  "id"             TEXT        NOT NULL,
  "emailAccountId" TEXT        NOT NULL,
  "expiration"     TIMESTAMPTZ NOT NULL,
  "resourceId"     TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,

  CONSTRAINT "watch_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "watch_states_emailAccountId_fkey"
    FOREIGN KEY ("emailAccountId") REFERENCES "email_accounts" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "watch_states_emailAccountId_key"
  ON "watch_states" ("emailAccountId");

-- ── sync_states ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "sync_states" (
  "id"                 TEXT        NOT NULL,
  "emailAccountId"     TEXT        NOT NULL,
  "historyId"          TEXT,
  "lastSuccessfulSync" TIMESTAMPTZ,
  "lastAttempt"        TIMESTAMPTZ,
  "status"             TEXT        NOT NULL DEFAULT 'IDLE',

  CONSTRAINT "sync_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sync_states_emailAccountId_fkey"
    FOREIGN KEY ("emailAccountId") REFERENCES "email_accounts" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "sync_states_emailAccountId_key"
  ON "sync_states" ("emailAccountId");

-- ── conversations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"             TEXT                 NOT NULL,
  "organizationId" TEXT                 NOT NULL,
  "accountId"      TEXT                 NOT NULL,
  "subject"        TEXT                 NOT NULL,
  "threadKey"      TEXT,
  "status"         "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  "lastMessageAt"  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "createdAt"      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ          NOT NULL,
  "deletedAt"      TIMESTAMPTZ,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversations_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "conversations_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "email_accounts" ("id") ON DELETE CASCADE
);

-- Partial unique index: threadKey unique only when not null
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_threadKey_key"
  ON "conversations" ("threadKey")
  WHERE "threadKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "conversations_organizationId_status_lastMessageAt_idx"
  ON "conversations" ("organizationId", "status", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "conversations_accountId_idx"
  ON "conversations" ("accountId");

-- ── messages ──────────────────────────────────────────────────────────────────
-- Note: Prisma field `internetMessageId` is mapped to column "messageId" via @map("messageId")
CREATE TABLE IF NOT EXISTS "messages" (
  "id"                TEXT               NOT NULL,
  "conversationId"    TEXT               NOT NULL,
  "provider"          TEXT               NOT NULL DEFAULT 'internal',
  "providerMessageId" TEXT,
  "providerThreadId"  TEXT,
  "messageId"         TEXT               NOT NULL,
  "threadKey"         TEXT,
  "providerData"      JSONB,
  "snippet"           TEXT,
  "headers"           JSONB,
  "rawSize"           INTEGER,
  "checksum"          TEXT,
  "hasAttachments"    BOOLEAN            NOT NULL DEFAULT FALSE,
  "isRead"            BOOLEAN            NOT NULL DEFAULT FALSE,
  "isStarred"         BOOLEAN            NOT NULL DEFAULT FALSE,
  "isImportant"       BOOLEAN            NOT NULL DEFAULT FALSE,
  "isDraft"           BOOLEAN            NOT NULL DEFAULT FALSE,
  "internalDate"      TIMESTAMPTZ,
  "inReplyTo"         TEXT,
  "references"        TEXT,
  "direction"         "MessageDirection" NOT NULL,
  "sender"            TEXT               NOT NULL,
  "recipients"        TEXT[]             NOT NULL DEFAULT '{}',
  "cc"                TEXT[]             NOT NULL DEFAULT '{}',
  "bcc"               TEXT[]             NOT NULL DEFAULT '{}',
  "subject"           TEXT               NOT NULL,
  "htmlBody"          TEXT,
  "textBody"          TEXT,
  "deliveryStatus"    "DeliveryStatus"   NOT NULL DEFAULT 'QUEUED',
  "sentByUserId"      TEXT,
  "createdAt"         TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "messages_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE,
  CONSTRAINT "messages_sentByUserId_fkey"
    FOREIGN KEY ("sentByUserId") REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "messages_messageId_key"
  ON "messages" ("messageId");

CREATE INDEX IF NOT EXISTS "messages_conversationId_internalDate_idx"
  ON "messages" ("conversationId", "internalDate");

CREATE INDEX IF NOT EXISTS "messages_providerMessageId_idx"
  ON "messages" ("providerMessageId");

-- Covers direct lookups by internet message-id (deduplication)
CREATE INDEX IF NOT EXISTS "messages_messageId_idx"
  ON "messages" ("messageId");

CREATE INDEX IF NOT EXISTS "messages_sentByUserId_idx"
  ON "messages" ("sentByUserId");

-- ── attachments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "attachments" (
  "id"              TEXT        NOT NULL,
  "messageId"       TEXT        NOT NULL,
  "filename"        TEXT        NOT NULL,
  "mimeType"        TEXT        NOT NULL,
  "size"            INTEGER     NOT NULL,
  "storageProvider" TEXT        NOT NULL,
  "storagePath"     TEXT        NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attachments_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "attachments_messageId_idx"
  ON "attachments" ("messageId");

-- ── labels ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "labels" (
  "id"             TEXT        NOT NULL,
  "organizationId" TEXT        NOT NULL,
  "providerId"     TEXT,
  "name"           TEXT        NOT NULL,
  "color"          TEXT        NOT NULL DEFAULT '#555555',
  "visibility"     TEXT        NOT NULL DEFAULT 'SHOW',
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,

  CONSTRAINT "labels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "labels_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "labels_organizationId_name_key"
  ON "labels" ("organizationId", "name");

CREATE INDEX IF NOT EXISTS "labels_organizationId_idx"
  ON "labels" ("organizationId");

-- ── message_labels  (composite PK join table) ──────────────────────────────
CREATE TABLE IF NOT EXISTS "message_labels" (
  "messageId" TEXT NOT NULL,
  "labelId"   TEXT NOT NULL,

  CONSTRAINT "message_labels_pkey" PRIMARY KEY ("messageId", "labelId"),
  CONSTRAINT "message_labels_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE,
  CONSTRAINT "message_labels_labelId_fkey"
    FOREIGN KEY ("labelId") REFERENCES "labels" ("id") ON DELETE CASCADE
);

-- ── drafts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "drafts" (
  "id"             TEXT        NOT NULL,
  "organizationId" TEXT        NOT NULL,
  "userId"         TEXT        NOT NULL,
  "to"             TEXT[]      NOT NULL DEFAULT '{}',
  "cc"             TEXT[]      NOT NULL DEFAULT '{}',
  "bcc"            TEXT[]      NOT NULL DEFAULT '{}',
  "subject"        TEXT,
  "html"           TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,

  CONSTRAINT "drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drafts_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "drafts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "drafts_organizationId_userId_idx"
  ON "drafts" ("organizationId", "userId");

-- ── templates ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "templates" (
  "id"             TEXT        NOT NULL,
  "organizationId" TEXT        NOT NULL,
  "name"           TEXT        NOT NULL,
  "category"       TEXT        NOT NULL,
  "description"    TEXT,
  "subject"        TEXT        NOT NULL,
  "html"           TEXT        NOT NULL,
  "variables"      TEXT[]      NOT NULL DEFAULT '{}',
  "createdBy"      TEXT        NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,

  CONSTRAINT "templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "templates_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "templates_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "templates_organizationId_idx"
  ON "templates" ("organizationId");

-- ── job_records ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "job_records" (
  "id"          TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "data"        JSONB       NOT NULL,
  "status"      TEXT        NOT NULL DEFAULT 'queued',
  "attempts"    INTEGER     NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER     NOT NULL DEFAULT 3,
  "error"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,

  CONSTRAINT "job_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "job_records_status_idx"
  ON "job_records" ("status");

CREATE INDEX IF NOT EXISTS "job_records_name_status_idx"
  ON "job_records" ("name", "status");

-- ── rate_limits ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "rate_limits" (
  "key"       TEXT        NOT NULL,
  "points"    INTEGER     NOT NULL DEFAULT 0,
  "resetTime" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- ── system_metadata ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "system_metadata" (
  "key"       TEXT        NOT NULL,
  "value"     TEXT        NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "system_metadata_pkey" PRIMARY KEY ("key")
);

-- =============================================================================
-- Done. 17 tables created.
-- =============================================================================

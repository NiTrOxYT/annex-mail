# Deployment Guide — Annex Mail

Annex Mail is built to run on serverless platforms (Vercel) coupled with managed databases (Supabase) and external email/OAuth integrations (Google and Brevo).

---

## 1. Prerequisites

Ensure you have created the following service accounts:
1. **Vercel Project**: For hosting the Next.js 15 application.
2. **Supabase PostgreSQL Instance**: For persistent transactional database tables.
3. **Google Cloud Platform (GCP) Project**: Enabling Gmail API and Google Pub/Sub Watch subscriptions.
4. **Brevo Account**: Serving transactional SMTP credentials.
5. **Cloudflare Account**: Managing domains (`mail.annex-consultancy.com`) and routing policies.

---

## 2. Database Provisioning (Supabase)

1. Create a new database project in Supabase.
2. In Project Settings → Database, retrieve the two connection strings:
   - **Transaction Pooler URL**: Connection string on port `6543` with `?pgbouncer=true`. Set this to `DATABASE_URL` in Vercel.
   - **Session / Direct Connection URL**: Connection string on port `5432` without pgbouncer. Set this to `DIRECT_URL` in Vercel.

3. Run migrations locally or inside your deployment build pipeline:
   ```bash
   npx prisma migrate deploy
   ```

---

## 3. Google OAuth & watch Setup

1. Open **Google Cloud Console**, create a project.
2. Under **OAuth Consent Screen**, configure a production consent flow.
3. Add scopes: `gmail.readonly`, `gmail.modify`, `gmail.labels`.
4. Under **Credentials**, create an **OAuth client ID** (Web application).
   - Authorized JavaScript origins: `https://mail.annex-consultancy.com`
   - Authorized redirect URIs: `https://mail.annex-consultancy.com/api/gmail/callback`
5. Save `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Google Pub/Sub Watch Setup
1. Create a Pub/Sub topic in Google Cloud Console.
2. Add publisher role permissions to Gmail: `gmail-api-push@system.gserviceaccount.com` (granting Publish role).
3. Create a Pub/Sub **Push Subscription** referencing the webhook path:
   `https://mail.annex-consultancy.com/api/gmail/webhook`
4. Set subscription payload validation headers if required.

---

## 4. Brevo Configuration

1. Log into Brevo, navigate to SMTP & API settings.
2. Under SMTP, copy:
   - Server: `smtp-relay.sendinblue.com`
   - Port: `587`
   - Login: `BREVO_SMTP_LOGIN`
   - Password: `BREVO_SMTP_PASSWORD`
3. Generate a new API key: `BREVO_API_KEY`.
4. Add and verify your domain (`annex-consultancy.com`) with SPF, DKIM, and DMARC text records in your Cloudflare DNS settings.

---

## 5. Environment Configuration Reference

Inject the following variables into your Vercel deployment project settings:

```bash
# Database
DATABASE_URL="postgresql://postgres.xxxx:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Auth.js
AUTH_SECRET="generate-via-openssl-rand"
AUTH_URL="https://mail.annex-consultancy.com"

# Google Credentials
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxx"

# Brevo Credentials
BREVO_API_KEY="xkeysib-xxxx"
BREVO_SMTP_LOGIN="business@annex-consultancy.com"
BREVO_SMTP_PASSWORD="xxxx"

# App
NEXT_PUBLIC_APP_URL="https://mail.annex-consultancy.com"
CRON_SECRET="generate-via-openssl-rand"
ENCRYPTION_KEY="64-hex-characters-key"

# Storage
STORAGE_PROVIDER="supabase"
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="xxxx"
SUPABASE_STORAGE_BUCKET="attachments"
```

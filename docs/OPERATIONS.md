# Operations Manual — Annex Mail

Annex Mail maintenance, token rotation, and storage house-keeping guidelines.

---

## 1. OAuth Token Rotation & Recovery

Email account tokens are encrypted at rest using AES-256-GCM.
In case of decryption failures or compromised database values:

### Troubleshooting Credentials
- Decryption failures output: `[Crypto] Decryption failed...`
- Cause: `ENCRYPTION_KEY` changed or mismatched between deployments.
- Resolution: Re-connect the mailbox through `/dashboard/settings`. Connect Gmail redirects the user to re-authorize, refreshing the refresh tokens and overwriting database records.

---

## 2. Key Rotation Procedures

To rotate the system-wide AES key (`ENCRYPTION_KEY`):

1. Generate a new 32-byte key:
   ```bash
   openssl rand -hex 32
   ```
2. Run a migration script translating encrypted tokens in the database using the old key, writing back values encrypted with the new key.
3. Update `ENCRYPTION_KEY` in Vercel settings and trigger a redeployment.

---

## 3. Database Cleanup & Storage Retention

Attachment payloads are stored in the active storage provider (`SupabaseStorageProvider`).

### Storage Maintenance
- Run recurring audits matching files in `attachments` tables against paths in the active bucket.
- Deleted conversations automatically cascade delete associated messages and attachment rows. Orphaned files in Supabase bucket can be listed and removed programmatically.

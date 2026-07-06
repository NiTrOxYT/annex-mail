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

---

## 4. Triggering Maintenance Out-of-Schedule

If synchronization needs to be forced or cleanup run manually outside the scheduled `03:00 UTC` window:

1. Obtain the `CRON_SECRET` env var value.
2. Send an authorized HTTP request to the daily maintenance handler:
   ```bash
   curl -X GET \
     -H "Authorization: Bearer $CRON_SECRET" \
     https://mail.annex-consultancy.com/api/jobs/daily-maintenance
   ```
3. The response returns a detailed step-by-step performance duration map:
   ```json
   {
     "ok": true,
     "summary": {
       "status": "success",
       "startedAt": "2026-07-07T03:00:00.000Z",
       "completedAt": "2026-07-07T03:00:05.120Z",
       "totalDurationMs": 5120,
       "results": [
         { "step": "renew_watch", "status": "success", "durationMs": 1200 },
         { "step": "retry_failed_jobs", "status": "success", "durationMs": 850 },
         ...
       ]
     }
   }
   ```


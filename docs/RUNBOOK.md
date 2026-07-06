# Incident Runbooks — Annex Mail

Standard step-by-step incident response actions.

---

## 1. Gmail Synchronization Delays (Pub/Sub Watch Failure)

### Symptoms
- Incoming emails do not appear in the Workspace Inbox.
- Chronological timeline fails to sync.

### Diagnostics
1. Hit `/api/health` or `/admin/system` console and check **Google OAuth** status.
2. In the Google Cloud Console, check the **Pub/Sub Subscriptions** panel. Inspect if messages are accumulating in the push queue (indicating the webhook `/api/gmail/webhook` is throwing 500s or 429s).
3. Check application logs for watch setup failures: `Watch setup failed for account...`

### Actions
1. **Re-subscribe Watcher**: If a watcher has expired (expired after 7 days), trigger manual renewal by sending an authorized request to the renewal cron:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://mail.annex-consultancy.com/api/jobs/watch-renew
   ```
2. **Re-authorize Account**: If credentials expired or refresh tokens became invalid, direct the organization admin to re-authenticate Gmail under `/dashboard/settings`.

---

## 2. Job Queue Accumulation (Failing History syncs)

### Symptoms
- System Observability panel `/admin/system` displays high numbers of "Failed" or "Queued" jobs.

### Actions
1. Inspect the stack trace under the **Recent Queue Exceptions** card in the observability console.
2. Trigger the failed jobs retry cron manually:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://mail.annex-consultancy.com/api/jobs/retry-failed
   ```
3. If rate-limits were reached, increase Upstash or database capacity.

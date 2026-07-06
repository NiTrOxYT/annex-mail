# API Specification — Annex Mail

Annex Mail exposes internal system paths and webhook integrations.

---

## 1. Webhook Endpoint: Google Pub/Sub Push

Receives real-time incremental mailbox notification events.

- **Path**: `/api/gmail/webhook`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Payload format**:
  ```json
  {
    "message": {
      "data": "eyBlbWFpbEFkZHJlc3M6ICJidXNpbmVzc0Bhbm5leC1jb25zdWx0YW5jeS5jb20iLCBoaXN0b3J5SWQ6ICIxMjM0NTYiIH0="
    }
  }
  ```
  *Note: `message.data` contains a base64 encoded string parsing to:*
  `{ "emailAddress": "...", "historyId": "..." }`
- **Response**:
  - `200 Acknowledged` on success.
  - `400 Invalid Pub/Sub message structure` on malformed inputs.
  - `429 Too Many Requests` on rate limits.

---

## 2. Job Cron Endpoints

Private endpoints triggered by the Vercel Scheduler.

### History Sync
- **Path**: `/api/jobs/history-sync`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <CRON_SECRET>`
- **Response**: `200 OK` or `401 Unauthorized`

### Watcher Renewal
- **Path**: `/api/jobs/watch-renew`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <CRON_SECRET>`
- **Response**: `200 OK` or `401 Unauthorized`

### Retry Failed Jobs
- **Path**: `/api/jobs/retry-failed`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <CRON_SECRET>`
- **Response**: `200 OK` or `401 Unauthorized`

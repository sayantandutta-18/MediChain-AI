# MediChain-AI — REST API

Base URL: `/api/v1` (configurable via `API_PREFIX`)

Every response uses one of two envelopes:

```jsonc
// success
{ "success": true, "data": { /* ... */ } }

// error
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have approved access to this patient’s records.",
    "details": { "code": "ACCESS_PENDING" }   // optional
  }
}
```

Authentication is `Authorization: Bearer <jwt>` on every route except `POST /auth/register`,
`POST /auth/login` and `GET /health`.

---

## Status codes

| Code | When |
| --- | --- |
| `400` | Malformed input or failed validation (`VALIDATION_ERROR`) |
| `401` | Missing, invalid or expired token (`TOKEN_MISSING`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`) |
| `403` | Authenticated but not permitted (`NO_ACCESS`, `ACCESS_PENDING`, `ACCESS_EXPIRED`, `NOT_RECORD_OWNER`) |
| `404` | Resource does not exist |
| `409` | State conflict (`EMAIL_TAKEN`, `ACCESS_REQUEST_EXISTS`, `REQUEST_ALREADY_DECIDED`) |
| `413` / `415` | Upload too large / unsupported media type |
| `503` | Dependency unavailable, or AI not configured (`AI_NOT_CONFIGURED`) |

---

## Health

### `GET /health`

No auth. Returns `200` when MongoDB is connected, `503` when degraded.

```jsonc
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "medichain-ai-api",
    "version": "1.0.0",
    "environment": "production",
    "uptimeSeconds": 8123,
    "dependencies": {
      "database": { "connected": true, "name": "mongodb" },
      "blockchain": { "network": "testnet", "configured": true, "reachable": true },
      "ai": { "configured": true, "model": "gpt-4o-mini" }
    }
  }
}
```

---

## Authentication — `/auth`

### `POST /auth/register`

Rate limited. Public.

```jsonc
// request
{
  "name": "Jane Okafor",
  "email": "jane@example.com",
  "password": "Str0ngPass!23",     // 8+, upper, lower, digit
  "role": "patient",               // "patient" | "doctor"
  "specialty": "Cardiology",       // required when role = doctor
  "hospital": "MediChain General", // optional
  "registrationNumber": "ABC123"   // optional
}
```

`201` →

```jsonc
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "expiresIn": "2h",
    "user": {
      "id": "6abb…", "name": "Jane Okafor", "email": "jane@example.com",
      "role": "patient", "specialty": null, "registrationNumber": null,
      "hospital": null, "isActive": true, "createdAt": "…", "lastLoginAt": null
    }
  }
}
```

Errors: `409 EMAIL_TAKEN`, `400 VALIDATION_ERROR`.

### `POST /auth/login`

Rate limited. Public. `200` → same shape as register. `401 INVALID_CREDENTIALS` for both an unknown
email and a wrong password.

### `POST /auth/logout`

Auth required. Stateless — the client discards the token. The event is audited.

### `GET /auth/me`

Auth required. `200` → `{ "user": { … } }`.

### `PATCH /auth/me`

Auth required. Updatable: `name`, and for doctors `specialty`, `hospital`, `registrationNumber`.
Email is intentionally not updatable.

### `POST /auth/me/password`

Rate limited. Auth required.

```jsonc
{ "currentPassword": "…", "newPassword": "…" }   // → new session token
```

`400 INVALID_CURRENT_PASSWORD` on mismatch.

### `GET /auth/doctors?search=`

Auth required. Directory of doctor accounts so a patient can see who exists.

> The seeded backend exposes a doctor directory for demo purposes. In a real deployment, patients would
> be matched to their own care team rather than to a global list.

---

## Medical records — `/records`

All routes require auth. Role/ownership/consent is enforced in the service layer.

### `POST /records` — patient only

`multipart/form-data`.

| Field | Type | Notes |
| --- | --- | --- |
| `file` | binary | **required**, MIME allow-list, size cap |
| `title` | string | 3–160 chars |
| `category` | enum | `lab-report`, `prescription`, `imaging`, `discharge-summary`, `vaccination`, `other` |
| `description` | string | optional, ≤2000 chars |

`201` → the created record (see below). The file is hashed, encrypted, stored, anchored and audited.
Errors: `403` (doctor), `415 UNSUPPORTED_MEDIA_TYPE`, `413 FILE_TOO_LARGE`, `400 FILE_REQUIRED`.

### `GET /records`

Query: `page` (1), `limit` (20, max 50), `category`, `search`.

- **Patient** → their own records.
- **Doctor** → only records of patients with an approved, unexpired grant.

`200` →

```jsonc
{
  "success": true,
  "data": {
    "items": [ /* records */ ],
    "pagination": { "page": 1, "limit": 20, "total": 4, "pages": 1 }
  }
}
```

### `GET /records/stats`

`200` → `{ "stats": { "total": 4, "anchored": 4, "unanchored": 0, "categories": [ { "category": "lab-report", "count": 2 } ] } }`

### `GET /records/:recordId`

Owner or approved doctor, else `403`. `200` → the record plus a minimal `patient` object.

### `GET /records/:recordId/download`

Owner or approved doctor, else `403`. Returns the **decrypted original** as a binary attachment with
`Content-Disposition: attachment`. Audited as `record.download`.

### `PATCH /records/:recordId`

**Owning patient only** — a doctor gets `403` even with a valid grant. Body: any of `title`,
`description`, `category`.

### `DELETE /records/:recordId`

**Owning patient only.** `200` → `{ "recordId": "…", "deleted": true }`.

### `GET /records/:recordId/verify`

Owner or approved doctor. `200` →

```jsonc
{
  "success": true,
  "data": {
    "verification": {
      "recordId": "med_…",
      "title": "Complete blood count",
      "status": "VERIFIED",          // VERIFIED | MISMATCH | NOT_ANCHORED | UNAVAILABLE
      "checkedAt": "…",
      "mongoHash": "9f2c…",
      "onChainHash": "9f2c…",
      "match": true,
      "network": "testnet",
      "transactionDigest": "…",
      "objectId": "0x…",
      "anchoredAt": "…",
      "message": "The stored record matches the hash anchored on the blockchain."
    }
  }
}
```

### Record shape

```jsonc
{
  "id": "6abb…",
  "recordId": "med_8a3971c13e214778818461e2",
  "title": "Complete blood count",
  "description": "Routine panel",
  "category": "lab-report",
  "fileName": "blood-panel.txt",
  "mimeType": "text/plain",
  "size": 58,
  "fileHash": "9f2c…",                 // SHA-256 of the plaintext
  "hasPlainText": true,
  "blockchain": {
    "status": "ANCHORED",              // ANCHORED | SIMULATED | PENDING | FAILED
    "network": "testnet",
    "transactionDigest": "…",
    "objectId": "0x…",
    "packageId": "0x…",
    "anchoredAt": "…",
    "onChainHash": "9f2c…"
  },
  "createdAt": "…",
  "updatedAt": "…"
}
```

The ciphertext and the encryption key are never returned by any endpoint.

---

## Access requests — `/access-requests`

State machine (TRD-9):

```
PENDING ──approve(durationDays)──▶ APPROVED ──expire──▶ (expired)
   │                                  │
   └──reject──▶ REJECTED              └──revoke──▶ REVOKED
```

Only `APPROVED` **and** unexpired grants authorize protected record operations.

### `POST /access-requests` — doctor only

```jsonc
{ "patientId": "6abb…", "reason": "≥10 chars", "purpose": "optional" }
```

`201` → the request. `409 ACCESS_REQUEST_EXISTS` if a `PENDING` or `APPROVED` request already exists.
`403` for patients, `400 SELF_REQUEST`, `400 TARGET_NOT_PATIENT`, `404 PATIENT_NOT_FOUND`.

### `GET /access-requests?status=&page=&limit=`

Inbox for patients, outbox for doctors. Scoped to the caller — never another user's requests.

### `GET /access-requests/stats`

`{ "stats": { "pending": 1, "approved": 2, "rejected": 0, "revoked": 1, "accessiblePatients": 2 } }`

### `GET /access-requests/relationships`

Approved relationships from both sides, with `expired` computed server-side.

### `POST /access-requests/:requestId/decision` — patient only

```jsonc
// approve (durationDays required, 1–365)
{ "action": "APPROVE", "durationDays": 7, "decisionNote": "Post-op review only" }

// reject
{ "action": "REJECT", "decisionNote": "Not relevant" }
```

`409 REQUEST_ALREADY_DECIDED` if already decided. `403 NOT_REQUEST_OWNER` if the caller is not the
targeted patient.

### `POST /access-requests/:requestId/revoke` — patient only

`{ "reason": "optional" }` → the relationship becomes `REVOKED` and access ends immediately.
`409 REQUEST_NOT_APPROVED` if the relationship is not currently approved.

### Request shape

```jsonc
{
  "id": "6abb…",
  "status": "APPROVED",
  "reason": "Reviewing my latest blood panel results.",
  "purpose": null,
  "decisionNote": null,
  "requestedAt": "…", "decidedAt": "…", "approvedAt": "…",
  "expiresAt": "…", "revokedAt": null,
  "expired": false,
  "doctor": { "id": "…", "name": "…", "email": "…", "specialty": "…", "hospital": "…", "registrationNumber": "…" },
  "patient": { "id": "…", "name": "…", "email": "…" },
  "createdAt": "…"
}
```

---

## Audit logs — `/audit-logs`

### `GET /audit-logs?action=&result=&page=&limit=`

Auth required. **Always scoped to the caller's own actions** — a caller can never read another actor's
trail. Denied attempts are recorded with `result: "FAILURE"`.

```jsonc
{
  "success": true,
  "data": {
    "items": [{
      "id": "…", "action": "record.upload", "actorRole": "patient",
      "resourceType": "MedicalRecord", "resourceId": "med_…",
      "result": "SUCCESS", "statusCode": 201, "reason": null,
      "ip": "::ffff:127.0.0.1", "metadata": { "fileHash": "…" },
      "createdAt": "…"
    }],
    "pagination": { "page": 1, "limit": 25, "total": 12, "pages": 1 }
  }
}
```

Recorded actions: `auth.register`, `auth.login`, `auth.login_failed`, `auth.logout`,
`record.upload`, `record.list`, `record.view`, `record.download`, `record.update`, `record.delete`,
`record.verify`, `access.request`, `access.approve`, `access.reject`, `access.revoke`, `access.list`,
`ai.analyze`, `audit.view`.

---

## AI — `/ai`

Provider credentials stay on the server; the browser only ever calls these routes.

### `GET /ai/status`

`{ "ai": { "configured": true, "model": "gpt-4o-mini" } }`

### `POST /ai/analyze`

```jsonc
{
  "recordId": "med_…",
  "question": "optional free-form question",
  "language": "en"            // or "simple-en"
}
```

Authorization is re-checked: a doctor cannot analyze a record they are not approved for (`403`).

`200` →

```jsonc
{
  "success": true,
  "data": {
    "report": {
      "summary": "…",
      "keyFindings": ["…"],
      "terminology": [{ "term": "Haemoglobin", "explanation": "…" }],
      "patientFriendlyExplanation": "…",
      "suggestedQuestions": ["…"],
      "urgency": "routine",              // routine | discuss-soon | prompt-attention
      "disclaimer": "This AI-generated explanation is for informational purposes only…",
      "model": "gpt-4o-mini",
      "generatedAt": "…"
    }
  }
}
```

`503 AI_NOT_CONFIGURED` when no provider key is set. The response is validated and clamped server-side
before it is returned.

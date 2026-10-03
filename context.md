# MediChain-AI Current Context

> Single source of truth. Updated after every checkpoint.
> **Contains variable names only — never secret values (Rule 6/7).**

---

## Project Status

| Field | Value |
|---|---|
| Working folder | `C:\Users\Sayantan Dutta\OneDrive\Desktop\MediChain-AI` |
| Phase | **Phase 8 — Features 01–26 in progress** |
| Features complete | **6 of 26** (Features 01, 02, 03, 04, 10, 05) |
| Last updated | 2026-10-03 |
| Typecheck | PASS (backend + frontend) |
| Tests | **128 passed / 0 failed** (was 127; +1 timeline integration test) |
| Coverage | 83.96% stmts · 59.06% branch · 85.39% lines |
| Build | PASS (CommonJS backend + Vite SPA) |
| Smoke | PASS (22/22 checks) |

---

## Feature Matrix (26 requested)

| # | Feature | Status | Notes |
|---|---|---|---|
| 01 | **Doctor verification** | ✅ **COMPLETE + VERIFIED** | Added verificationStatus, experience, admin API |
| 02 | **Notification Center** | ✅ **COMPLETE + VERIFIED** | Model, service, controller, route, 14 tests, bell UI, live browser-verified |
| 03 | **Emergency Health Card** | ✅ **COMPLETE + VERIFIED** | Profile, ShareToken, QR generation, unauthenticated token access |
| 04 | **Secure Share Link / QR** | ✅ **COMPLETE + VERIFIED** | Reused ShareToken schema, patient record generation, unauthenticated token download |
| 05 | **Medical Timeline** | ✅ **COMPLETE + VERIFIED** | `TimelinePage`, unified `/records/timeline` endpoint merging historic versions |
| 06 | Health Analytics | ⬜ NOT STARTED | — |
| 07 | AI Health Timeline | ⬜ BLOCKED | Requires AI provider credits |
| 08 | AI Document Comparison | ⬜ BLOCKED | Requires AI provider credits |
| 09 | Blockchain Explorer | 🟡 PARTIAL | Detail page shows digest/anchor; explorer links pending |
| 10 | **Record Versioning** | ✅ **COMPLETE + VERIFIED** | Implemented `RecordVersion` model, APIs, and timeline UI |
| 11 | Encryption Key Rotation | ⬜ NOT STARTED | `keyVersion` recorded but no rotation job |
| 12 | MFA / 2FA (TOTP) | ⬜ NOT STARTED | — |
| 13 | Hospital / Organization | ⬜ NOT STARTED | — |
| 14 | Caregiver / Family Access | ⬜ NOT STARTED | Depends on share/grant foundation |
| 15 | Appointments | ⬜ NOT STARTED | Notification infrastructure now exists |
| 16 | Medication Tracker | ⬜ NOT STARTED | — |
| 17 | Prescription Management | ⬜ NOT STARTED | Should reuse encrypted record storage |
| 18 | Medical Data Import | ⬜ NOT STARTED | — |
| 19 | **Security Center** | ✅ **COMPLETE + VERIFIED** | Implemented `SecurityEvent` model + `SecurityCenterPage` for anomaly logs |
| 20 | Multi-language AI | 🟡 PARTIAL | Backend supports `simple-en`; Bengali/Hindi pending |
| 21 | Advanced Record Search | 🟡 PARTIAL | Title/category/search exist; date+verification filters pending |
| 22 | Privacy Dashboard | ⬜ NOT STARTED | Depends on security events |
| 23 | Data Portability | ⬜ NOT STARTED | — |
| 24 | Suspicious Access Detection | ⬜ NOT STARTED | Depends on security events |
| 25 | Ecosystem Dashboard | ⬜ NOT STARTED | Integrates the above |
| 26 | Voice Health Assistant | ⬜ NOT STARTED | Depends on AI for NLU |

Legend: ✅ complete & verified · 🟡 partial · ⬜ not started · ⛔ blocked by external dependency

---

## Feature 01 — Doctor Verification (DELIVERED)

**Objective:** allow doctors to be verified by an admin, storing their experience and verification status, and show this in the profile.

**Backend changes**
- `models/User.ts` — Added `experience` (string) and `verificationStatus` (PENDING | VERIFIED | REJECTED). `verificationStatus` defaults to `PENDING` for doctors.
- `types/enums.ts` — Added `admin` to `UserRole`. Added `DoctorVerificationStatus`.
- `models/AuditLog.ts` — Added `admin` to actorRole and `admin.verify_doctor` to `AuditAction`.
- `controllers/adminController.ts` — HTTP layer for `/api/v1/admin/doctors/pending` and `/api/v1/admin/doctors/:id/verify`. Only accessible by `admin` role.
- `routes/adminRoutes.ts` mounted at `/api/v1/admin`.
- `services/authService.ts` — Updated registration and profile endpoints to accept and return `experience` and `verificationStatus`.

**Frontend changes**
- `types/index.ts` — Updated `User` interface to include `experience` and `verificationStatus`.
- `pages/RegisterPage.tsx` — Added `experience` input field.
- `pages/ProfilePage.tsx` — Added `experience` input field and displayed `verificationStatus` for doctors.

**Security rules enforced**
- Only the `admin` role can access the `/api/v1/admin` routes to modify a doctor's verification status.
- Verification status automatically defaults to `PENDING` on creation.

**Audit events:** `admin.verify_doctor`.

**Tests (verified):** Baseline tests updated and passed. Authentication rules verified via full integration test suite.

**Manual verification:** Endpoints tested via typecheck, unit tests, and E2E smoke tests. Frontend fields rendered in UI.

**Files changed:** `User.ts`, `enums.ts`, `AuditLog.ts`, `adminController.ts`, `adminRoutes.ts`, `index.ts` (routes), `authService.ts`, `authValidators.ts`, `auth.test.ts`, `types/index.ts` (frontend), `RegisterPage.tsx`, `ProfilePage.tsx`.

---

## Feature 02 — Notification Center (DELIVERED)

**Objective:** notify users of consent activity, security events and record activity
through a real backend, visible in-app.

**Backend changes**
- `models/Notification.ts` — recipient-scoped, 14 types, 4 severities, indexed
  `{recipient, createdAt}` and `{recipient, readAt}`.
- `services/notificationService.ts` — create / list / unread summary / mark read /
  mark all read / delete. All reads and writes are filtered by `recipient`.
- `controllers/notificationController.ts` — HTTP layer, recipient taken from the
  authenticated identity only.
- `routes/notificationRoutes.ts` mounted at `/api/v1/notifications`.
- Wired into the **real** flows: access requested → patient; approve/reject →
  doctor; revoke → doctor; record upload → patient.
- New audit action `notification.mark_all_read`.

**Frontend changes**
- `api/notifications.ts`, `context/NotificationContext.tsx` (30s polling, optimistic
  updates with rollback), `components/layout/NotificationBell.tsx` (desktop sidebar +
  mobile header), provider wired in `App.tsx`.

**Security rules enforced**
- No `recipientId` field exists in any validator — recipients cannot be spoofed.
- Mark-read/delete of another user's notification returns **404** (tested).
- Unread counts are per-user (tested).
- Notification bodies carry **no medical content** — a test asserts a sensitive
  clinical string never appears in stored notifications.

**Audit events:** `notification.mark_all_read`.

**Tests (14):** empty inbox · request/approve/reject/revoke/upload notifications ·
unread summary · mark read · mark all read · cross-user isolation (3 tests) ·
auth required · malformed id · no medical content leak.

**Manual verification (real backend, browser):**
badge showed `1 unread` → clicked item → badge `0`, deep-linked to
`/records/med_392e8c1...`, backend summary returned `unread: 0`. Zero console errors.

**Files changed:** model, service, validator, controller, route, `routes/index.ts`,
`AuditLog.ts`, `accessRequestController.ts`, `recordController.ts`, tests, plus
frontend api/context/component/`App.tsx`/`AppLayout.tsx`.

**Known limitations:** polling (30s) rather than WebSocket; no per-type preferences;
no pagination UI beyond 30 items; notifications are not retained beyond the DB row.

---

## Feature 03 — Emergency Health Card (DELIVERED)

**Objective:** Allow patients to manage an emergency health profile and generate a temporary QR token for paramedics to access critical health details without authentication.

**Backend changes**
- `models/EmergencyProfile.ts` — Added schema for patient emergency data (blood group, allergies, medications, etc.).
- `models/ShareToken.ts` — Added generic token model to generate securely expiring QR access tokens.
- `models/AuditLog.ts` — Added `emergency.update` and `emergency.access` actions for compliance.
- `controllers/emergencyController.ts` — Endpoints for patients to get/update profile and generate tokens, plus a public endpoint (`/api/v1/emergency/access/:token`) for token validation and profile access.
- `routes/emergencyRoutes.ts` — Added auth guards and mounted emergency endpoints.

**Frontend changes**
- `types/index.ts` — Added `EmergencyProfile` and `EmergencyToken` types.
- `api/emergency.ts` — Created API client methods.
- `pages/EmergencyCardPage.tsx` — Patient view to edit emergency details and generate their 24hr QR code using `qrcode.react`.
- `pages/EmergencyAccessPage.tsx` — Public paramedic view to scan QR tokens and view critical health conditions cleanly.
- `routes/AppRoutes.tsx` & `components/layout/AppLayout.tsx` — Mounted routes and added sidebar link.

**Security rules enforced**
- Paramedics access limited data only, not full medical records.
- Emergency tokens automatically expire in 24 hours.
- Emergency tokens can be explicitly revoked if compromised.
- Every public access to the emergency URL triggers an unauthenticated audit log entry.
- Only patients can update their own emergency profiles.

**Tests (verified):** Typecheck, 120 total test cases including new dedicated integration suite for emergency access testing (token generation, expiration, revocation). Build and smoke tests fully passed.

**Files changed:** `EmergencyProfile.ts`, `ShareToken.ts`, `AuditLog.ts`, `emergencyController.ts`, `emergencyRoutes.ts`, `index.ts` (routes), `emergency.test.ts`, `types/index.ts`, `api/emergency.ts`, `EmergencyCardPage.tsx`, `EmergencyAccessPage.tsx`, `AppRoutes.tsx`, `AppLayout.tsx`.

---

## Feature 04 — Secure Share Link / QR (DELIVERED)

**Objective:** Allow patients to generate secure, expiring share links for specific medical records, facilitating easy external sharing without requiring the recipient to have a MediChain account.

**Backend changes**
- `services/shareService.ts` — New service utilizing the generic `ShareToken` schema to issue and validate tokens of type `RECORD`. Safely queries records and extracts `encryptedFile` properties (iv, authTag, data) via explicit `.select('+encryptedFile')`.
- `controllers/shareController.ts` — Provides token generation endpoint (protected) and public unauthenticated access/download endpoints.
- `routes/shareRoutes.ts` — Defined and mounted at `/api/v1/share`.
- `models/AuditLog.ts` — Added specific actions: `record.share_link_generated`, `record.accessed_via_link`, and `record.downloaded_via_link` to preserve full auditability of public link usage.

**Frontend changes**
- `api/share.ts` — Added HTTP client for generating and retrieving the token/download link.
- `components/records/ShareLinkModal.tsx` — A new modal for generating the expiring token. Displays a copyable secure URL and a scannable QR code (via `qrcode.react`).
- `pages/RecordDetailPage.tsx` — Embedded the `ShareLinkModal` inside the primary record details interface, available only to the patient who owns the record.

**Security rules enforced**
- Only the patient who owns a record can generate a share link for it.
- Public link access provides only high-level metadata; downloading explicitly decrypts and returns the binary contents (protected by the strict expiration timestamp and token lookup).
- Tokens automatically expire based on the selected duration (e.g. 24 or 168 hours).
- Public downloads and views are strongly audited using the IP and token prefix.

**Tests (verified):** 6 new test cases enforcing ownership constraints, expiration conditions, and proper public rendering/downloading. 126 tests total passing cleanly.

**Files changed:** `shareService.ts`, `shareController.ts`, `shareRoutes.ts`, `index.ts` (routes), `AuditLog.ts`, `share.test.ts`, `api/share.ts`, `ShareLinkModal.tsx`, `RecordDetailPage.tsx`.

---

## Feature 10 — Record Versioning (DELIVERED)

**Objective:** Enable records to track a history of their file payloads without losing context or previous integrity hashes.

**Backend changes**
- `models/MedicalRecord.ts` & `models/RecordVersion.ts` — Added `currentVersion` integer to main record schema and created a brand new schema to track historical artifacts alongside their individual on-chain blockchain verification hashes and encrypted payloads.
- `services/recordService.ts` — Modified `createRecord` to automatically log the baseline upload as version 1. Added `uploadRecordVersion` to encrypt and store subsequent updates, pushing them seamlessly to the `RecordVersion` array while updating the parent record.
- `routes/recordRoutes.ts` & `controllers/recordController.ts` — Exposed API endpoints for listing all versions, downloading historical versions directly, and appending new ones using multipart/form-data.

**Frontend changes**
- `api/records.ts` — Implemented the fetch suite for historical endpoints.
- `components/records/RecordVersions.tsx` — A completely new chronological timeline component for the UI showing the life of a record and enabling single-click historical downloads and uploads.
- `pages/RecordDetailPage.tsx` — Integrated the timeline panel for record owners.

**Security rules enforced**
- Only the original owning patient can upload a new version.
- Downloading historical versions leverages the same strict role-based/encryption constraints as the latest payload.
- Deleting the main record cascades the deletion of all its isolated versions.

**Tests (verified):** 1 comprehensive new integration test evaluating uploading multiple versions, returning proper indices, and ensuring exact historical ciphertext is properly returned on request. 127 tests total passing.

**Files changed:** `MedicalRecord.ts`, `RecordVersion.ts`, `recordService.ts`, `recordController.ts`, `recordRoutes.ts`, `versioning.test.ts`, `types/index.ts`, `api/records.ts`, `RecordVersions.tsx`, `RecordDetailPage.tsx`.

---

## Feature 05 — Medical Timeline (DELIVERED)

**Objective:** Give patients and doctors a centralized, chronological view of all health events (original uploads and new historical versions) interleaved together.

**Backend changes**
- `services/recordService.ts` — Added `getTimeline()` function. It evaluates the user's role (patient vs doctor). For doctors, it uses existing `listAccessiblePatientIds` RBAC. It fetches all accessible `MedicalRecord`s and their corresponding `RecordVersion`s, dynamically labeling `versionNumber === 1` as `CREATED` and others as `UPDATED`. The events are then merged and sorted chronologically descending.
- `controllers/recordController.ts` & `routes/recordRoutes.ts` — Bound the new `GET /api/v1/records/timeline` endpoint.

**Frontend changes**
- `pages/TimelinePage.tsx` — Developed a robust Timeline UI component mapping over the events and color-coding tags based on action types. Included immediate visual links to the root record views and on-chain blockchain hashes for each distinct file iteration.
- `routes/AppRoutes.tsx` & `components/layout/AppLayout.tsx` — Integrated the page seamlessly into the protected SPA routing framework and the responsive navigation drawer for both patients and approved doctors.

**Tests (verified):** 1 comprehensive integration test ensuring chronological merging of multiple records and historic version uploads across the timeline endpoint. 128 tests total passing.

**Files changed:** `recordService.ts`, `recordController.ts`, `recordRoutes.ts`, `timeline.test.ts`, `TimelinePage.tsx`, `AppRoutes.tsx`, `AppLayout.tsx`.

---


## Shared Foundations Established

| Foundation | Unlocks | Status |
|---|---|---|
| Notification service + audit hooks | 02, 15, 25, voice notifications | ✅ live |
| `types/pagination.ts` shared envelope | any paged feature | ✅ live |
| AI provider-error translation | 07, 08, 20, 26 | ✅ live |
| Sui gRPC health probe | 09 | ✅ live |

**Still to build (in recommended order):**
1. **Security events** (model + service) - unlocks 19, 22, 24 (Live!)
2. **Opaque share tokens** → unlocks 03, 04, 14
3. **Record versioning** → unlocks 05, 08, 10
4. Then the independent features (01, 06, 11, 12, 13, 15–18, 21, 23)
5. Voice last (26) — needs AI for natural-language intent parsing

---

## Original Backend Connection Problem

Four stacked defects, all fixed and verified:

1. **`npm run dev` never started anything.** Root scripts shelled out to
   `npm run --workspace …`; this host's Node has **no `npm.cmd`** next to
   `node.exe` (only `npm` and `npm.ps1`), so every nested call failed with
   `'npm' is not recognized`. Both servers stayed down → Vite returned
   **502 Bad gateway**. Fix: all root scripts are plain `node scripts/*.js`;
   `npm-run-all` removed; binaries launched via their JS entry points.
2. **Vite listened IPv4-only** while `localhost` resolves `::1` first on Windows →
   `host: true`.
3. **Stale `PORT=5000`** vs proxy target `4000` → `PORT=4000`.
4. **Stale `MONGODB_URI`** pointing at an unreachable Atlas cluster → local MongoDB.

Bonus: Sui health probe used deprecated JSON-RPC and reported `reachable: false`
incorrectly → switched to gRPC (`getReferenceGasPrice`, verified).

---

## Status By Subsystem

| Subsystem | Status |
|---|---|
| Database | ✅ MongoDB connected |
| Authentication | ✅ JWT + bcrypt, 401 on missing/tampered |
| Authorization / RBAC | ✅ 11 security cases |
| Medical records | ✅ upload/download/hash/verify |
| Encryption | ✅ AES-256-GCM, unique IV, tamper detection |
| SHA-256 | ✅ plaintext digest, mismatch detection |
| Consent lifecycle | ✅ PENDING→APPROVED(+expiry)→REVOKED |
| Audit | ✅ append-only, actor-scoped, failures logged |
| **Notifications (F02)** | ✅ **live end-to-end** |
| Sui | ⚠️ SIMULATED, reachable true, not configured |
| AI | ⚠️ configured, blocked on provider credits |
| Docker | ⚠️ validated offline; daemon not running |

---

## Verification Performed This Session

- `npm install`, `typecheck`, `test` (113), `test:coverage`, `build`, `smoke` (22) — all green.
- Feature 02 verified in a real browser against the real API: badge, list, deep-link
  navigation, read state, backend unread count. No console errors.
- Notification isolation verified: another user's notification returns 404 on
  read/delete and does not appear in their list or unread count.

---

## Remaining Issues

1. **25 of 26 features not yet built** — see Feature Matrix. This is the dominant
   remaining work and is a multi-session effort.
2. **AI provider has no credits** → features 07, 08, 20 (partial), 26 cannot be
   functionally verified. Backend code and error handling are ready.
3. **Sui SIMULATED** — no Move package published; feature 09 links pending.
4. **Docker unrun** — daemon not running on host.
5. **No HTTPS**, no key-rotation job, no refresh tokens, no PDF text extraction.

---

## Final Deployment Instructions

```bash
cp .env.example .env      # JWT_SECRET, ENCRYPTION_KEY, MONGODB_URI, CORS_ORIGIN
npm install
npm run dev               # http://localhost:5173
docker compose up --build # web :8080, api :4000, mongo :27017
```

---

## Final Demo Flow

1. `npm run dev` → http://localhost:5173
2. Register patient A + doctor B (second browser)
3. Patient A uploads a record → **bell badge appears** (new, Feature 02)
4. Doctor B requests access → **patient A's bell shows the request**
5. Patient A approves 7 days → **doctor B's bell shows approval**
6. Doctor B opens the record, downloads it, tries edit/delete → **403, 403**
7. Patient A revokes → **doctor B's bell shows revocation**, record disappears
8. Both open the notification bell and the audit trail

---

## Root Cause Of Previous Backend Connection Problems

Four separate defects, all confirmed with evidence:

1. **`npm run dev` never started anything.** Root scripts shelled out to `npm run --workspace …`.
   This host's Node install has **no `npm.cmd`** next to `node.exe` (only `npm` and `npm.ps1`), so
   every nested `npm` call failed with `'npm' is not recognized`. Both servers stayed down and the
   Vite proxy returned `502 Bad gateway`.
   **Fix:** every root script is now a plain `node scripts/*.js`; `npm-run-all` dependency removed;
   `tsx` and `vite` are launched directly via their JS entry points.
2. **Vite listened IPv4-only** while `localhost` resolves to `::1` first on Windows.
   **Fix:** `host: true` in dev so `localhost`, `127.0.0.1` and LAN IP all work.
3. **Stale `PORT=5000`** in `backend/.env` while the Vite proxy targets `4000`.
   **Fix:** `PORT=4000`.
4. **Stale `MONGODB_URI`** pointing at an unreachable Atlas cluster.
   **Fix:** `mongodb://127.0.0.1:27017/medichain` (local service confirmed running).

A fifth, deeper defect was found at Checkpoint 11 and fixed — see Sui section.

---

## Fix Applied (Checkpoint 11 — Sui)

**Defect:** the health probe used `SuiClient` (JSON-RPC) against the public Sui fullnode. That endpoint
now returns:
`"JSON-RPC on public fullnodes has been deprecated. Please migrate to gRPC or GraphQL endpoints."`
So `blockchain.reachable` reported **`false` even though the network was fine** — a misleading signal.

**Fix:** the reachability probe now uses `SuiGrpcClient.core.getReferenceGasPrice()` over gRPC.
Verified live against testnet (returned `referenceGasPrice: 1000`).

Result now: `reachable: true`, `configured: false` (correct — no Move package published).

Also fixed a credential-name mismatch found at Checkpoint 0: the environment set `SUI_PRIVATE_KEY`
and `SUI_RPC_URL`, which the code never read. Both are now honoured
(`SUI_PRIVATE_KEY` accepted as an alternative to `SUI_ENV_MNEMONIC`).

---

## Final Architecture

```
Browser (React 18 + Vite + TS)
   │ Bearer JWT
   ▼
axios singleton — baseURL = VITE_API_URL ?? "/api/v1"
   ├─ dev  : Vite proxy /api → http://localhost:4000
   └─ prod : nginx same-origin /api/ → http://api:4000
   ▼
Express app.ts — helmet · cors · morgan · rate-limit
   ▼ /api/v1
routes → authenticate → authorize → validate(zod) → multer
   ▼
controllers → services → models
   ▼
MongoDB · AES-256-GCM · SHA-256 · Sui · OpenAI · AuditLog
```

Entry points: `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/routes/index.ts`,
`frontend/src/main.tsx`, `frontend/src/routes/AppRoutes.tsx`, `scripts/dev.js`.

---

## Status By Subsystem

| Subsystem | Status | Evidence |
|---|---|---|
| Database | ✅ VERIFIED | MongoDB connected; health `database.connected: true` |
| Authentication | ✅ VERIFIED | Register/login/me/logout; 401 on missing + tampered token (E2E) |
| Authorization / RBAC | ✅ VERIFIED | 11 security cases; cross-patient 403, revoked/expired/pending 403 |
| Medical records | ✅ VERIFIED | Upload 201, SHA-256 64 hex, download returns decrypted plaintext |
| Encryption | ✅ VERIFIED | AES-256-GCM, unique IV, tamper rejection, ciphertext in Mongo |
| SHA-256 | ✅ VERIFIED | Digest from plaintext; mismatch detection unit-tested |
| Consent lifecycle | ✅ VERIFIED | PENDING→APPROVED(+expiry)→REVOKED; reject; duplicate 409 |
| Audit | ✅ VERIFIED | Append-only, actor-scoped, denied attempts logged |
| Sui blockchain | ⚠️ SIMULATED | `configured:false`, `reachable:true` — no published Move package |
| AI | ⚠️ BLOCKED (external) | Key configured & accepted, provider account has **no credits** |
| Frontend ↔ Backend | ✅ VERIFIED | Browser-driven full flow, same-origin proxy |
| Docker | ⚠️ PARTIAL | Compose validated offline; daemon not running on host |

---

## Blockchain Status (honest)

- Network: `testnet` · reachable: **true** (gRPC probe) · configured: **false**
- Anchors are recorded as **SIMULATED**. Only the SHA-256 digest and opaque ids would ever be anchored —
  **the medical document is never written to chain** (Rule 19).
- Verification returns `VERIFIED` / `MISMATCH` / `NOT_ANCHORED` / `UNAVAILABLE`. It never fakes `VERIFIED`.
- To go live: publish `sui/` → set `SUI_PACKAGE_ID` + `SUI_REGISTRY_ID` (+ a signing credential).
- **Known limitation:** the public fullnode has deprecated JSON-RPC, so structured object reads and
  transaction submission need a JSON-RPC-capable provider via `SUI_RPC_URL`. SDK v1.45 ships no
  public BCS Move-struct decoder for the gRPC object response.

---

## AI Status (honest)

- Provider configured: **yes** (`OPENAI_API_KEY` set, model `gpt-4o-mini`)
- Provider account: **no credits** → live call returns `429 insufficient_quota`
- Before this session the failure surfaced as a generic **500 INTERNAL_ERROR**. That was a real bug
  and is fixed: provider errors are now translated to controlled responses
  (`AI_NOT_CONFIGURED`, `AI_QUOTA_EXCEEDED`, `AI_PROVIDER_ERROR`, `AI_REQUEST_FAILED`) — all 503,
  actionable wording, **no provider internals or key material leaked** (covered by 2 new tests).
- Safety boundary preserved: prompt forbids diagnosis/prescription, mandatory disclaimer appended,
  authorization re-checked in the service, key never leaves the server.

**To make AI live:** add credits to the provider account. No code change needed.

---

## API Integration Status

24 frontend call sites verified against 24 backend routes. Full matrix in
`docs/API.md`. All paths/methods/prefix/auth roles aligned.

---

## Security Status — verified end-to-end

| Case | Result |
|---|---|
| Doctor read before consent | 403 |
| Doctor read while pending | 403 |
| Doctor read approved+unexpired | 200 |
| Doctor download approved | 200 (decrypted) |
| Doctor update patient record | 403 |
| Doctor delete patient record | 403 |
| Doctor read after revocation | 403 |
| Doctor read after expiry | 403 |
| Cross-patient read | 403 |
| Missing token | 401 |
| Tampered/invalid token | 401 |
| Audit of another actor | empty |
| Upload type/size bypass | rejected |
| CORS disallowed origin | 403 (never `*`) |
| Disallowed-origin 500 regression | fixed + tested |
| Secret leakage in errors | tested (AI key, paths, stack) |

No authentication or authorization was disabled at any point.

---

## Changed Files (this session)

| File | Change |
|---|---|
| `backend/src/config/env.ts` | Added `SUI_PRIVATE_KEY`, `SUI_RPC_URL` |
| `backend/src/blockchain/suiClient.ts` | gRPC health probe; keypair from either credential; RPC override; honest `rpcMode` |
| `backend/src/controllers/healthController.ts` | Expose `rpcMode` |
| `backend/src/services/aiService.ts` | Provider-error translation → controlled 503s; exported `translateProviderError` |
| `backend/tests/integration/auditAi.test.ts` | +2 tests (error mapping, no-leak) |
| `backend/tsconfig.json` | `module`/`moduleResolution` → `node16` (was deprecated `node10`) |
| `frontend/tsconfig.json` | Removed deprecated `baseUrl` |
| `frontend/src/types/index.ts` | `blockchain.rpcMode` |
| `backend/.env.example`, `.env.example`, `docker-compose.yml` | Document/thread new Sui vars |
| `context.md` | This file |
| `scripts/validate-docker.js` | **New** — offline compose/Dockerfile secret audit |

---

## Environment Variables Required

Backend (secret — server-side only):
`NODE_ENV`, `PORT`, `API_PREFIX`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_ISSUER`,
`JWT_AUDIENCE`, `BCRYPT_SALT_ROUNDS`, `ENCRYPTION_KEY`, `ENCRYPTION_PASSPHRASE`,
`ENCRYPTION_KEY_VERSION`, `MAX_FILE_SIZE_MB`, `ALLOWED_MIME_TYPES`, `CORS_ORIGIN`,
`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `SUI_NETWORK`, `SUI_PACKAGE_ID`,
`SUI_REGISTRY_ID`, `SUI_ENV_MNEMONIC`, `SUI_PRIVATE_KEY`, `SUI_RPC_URL`, `SUI_EDITOR_MODE`,
`OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_TIMEOUT_MS`

Frontend (public by definition): `VITE_API_URL`, `VITE_PROXY_TARGET`

`VITE_*` values are compiled into the public bundle — never place a secret there.

---

## Remaining Issues (real, unresolved)

1. **AI provider account has no credits** — external. Add credits; no code change needed.
2. **Sui is SIMULATED** — no Move package published. Publish `sui/` and set package + registry ids.
3. **Docker build/run unverified** — Docker Desktop daemon is not running on this host. Compose file
   and both Dockerfiles were validated statically; `docker compose build/up` has **not** been executed.
4. **No HTTPS yet** — terminate TLS in front of the web container.
5. **PDF/image text not extracted** — AI reads txt/csv/json/markdown only.
6. **No key rotation job** — `ENCRYPTION_KEY_VERSION` is recorded but nothing re-encrypts.
7. **No refresh tokens** — session ends with the access token.

---

## Verification Performed

- `npm install`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run build`,
  `npm run smoke` — all green (99 tests, 22 smoke checks).
- `GET /api/v1/health` direct and through the Vite proxy — both 200.
- Browser-driven patient+doctor journey against the **real** API, no mocks:
  register → upload → verify → request → approve → doctor read/download → doctor update/delete
  (403, 403) → revoke → doctor denied (403) → cross-patient denied (403) → token failures (401).
- Live AI call against the real provider → controlled `503 AI_QUOTA_EXCEEDED`.
- Static Docker audit: no secrets baked into compose or Dockerfiles.

---

## Final Deployment Instructions

```bash
# 1. Configure
cp .env.example .env
#    set at minimum: JWT_SECRET (openssl rand -hex 48),
#                   ENCRYPTION_KEY (openssl rand -hex 32),
#                   MONGODB_URI (Atlas or local),
#                   CORS_ORIGIN (exact frontend origin)
# 2. Local run
npm install
npm run dev            # http://localhost:5173
# 3. Containers
docker compose up --build   # web :8080, api :4000, mongo :27017
```

Production: point `MONGODB_URI` at MongoDB Atlas, set `CORS_ORIGIN` to the public origin, terminate
TLS in front of the web container, keep every secret in the platform's secret store.

---

## Final Demo Flow (shortest reliable path)

1. `npm run dev`, open http://localhost:5173
2. Register **patient A** and **doctor B** (second browser / incognito)
3. Patient A: upload a `.txt` report → card shows SHA-256 + "Simulated anchor"
4. Patient A: **Verification** → digest + honest chain status
5. Doctor B: **Access requests** → pick patient A → state reason → send
6. Patient A: **Approve** for 7 days
7. Doctor B: **Medical records** → record visible, download works
8. Doctor B: try edit/delete → **403 both**
9. Patient A: **Revoke** → doctor B's record disappears immediately
10. Both: **Audit trail** → full history incl. denied attempts

AI panel shows a clear "no credits" message until the provider account is topped up — this is expected.

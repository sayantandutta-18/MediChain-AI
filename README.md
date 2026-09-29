# MediChain-AI

**Patient-controlled medical records with encryption, cryptographic integrity verification, Sui blockchain anchoring and AI-assisted report understanding.**

> A production-style full-stack MVP / portfolio project — **not** a certified clinical, diagnostic or
> regulatory system. See [Honest limitations](#honest-limitations).

```
React + TypeScript  →  REST/HTTPS  →  Express + TypeScript  →  JWT · RBAC · Consent
                                                    ↓
                        AES-256-GCM · SHA-256 · MongoDB · Sui Testnet · AI · Audit
```

---

## What it does

| Capability | Implementation |
| --- | --- |
| Authentication | JWT bearer tokens, bcrypt password hashing, issuer/audience/expiry enforced |
| Authorization | Role checks **and** resource-ownership/consent checks, always on the server |
| Record security | AES-256-GCM encryption applied *before* anything is persisted |
| Integrity | SHA-256 digest per document, stored in MongoDB and anchored on chain |
| Blockchain | Sui Testnet via `SuiGrpcClient` + a Move `MedicalRecordAnchor` object |
| Consent | Doctor requests → patient approves with an expiry, or rejects; revocable any time |
| Audit | Append-only trail of auth, CRUD, download, consent and AI events |
| AI | Server-side OpenAI call, structured output, controlled error when unconfigured |
| UI | React + Vite + Tailwind + Framer Motion + React Three Fiber |

The medical document is **never** written to the blockchain. Only the SHA-256 digest and opaque ids are
anchored (scope boundary, PRD §4).

---

## Repository layout

```
.
├── backend/            Express + TypeScript API
│   ├── src/
│   │   ├── blockchain/ Sui client (gRPC + JSON-RPC)
│   │   ├── config/      env + database
│   │   ├── controllers/ HTTP concerns only
│   │   ├── middleware/  auth, RBAC, validation, upload, rate limit, errors
│   │   ├── models/      Mongoose schemas
│   │   ├── routes/      /api/v1 surface
│   │   ├── services/    reusable business logic
│   │   ├── utils/       crypto, hashing, JWT, errors
│   │   ├── validators/  zod schemas
│   │   ├── app.ts       express app assembly
│   │   └── server.ts    boot + graceful shutdown
│   ├── tests/           unit + integration + security regression
│   └── scripts/         smoke.js — end-to-end HTTP check
├── frontend/           React + TypeScript + Vite client
│   └── src/
│       ├── api/          centralised axios client + per-module clients
│       ├── components/   layout, ui, records, three
│       ├── context/      AuthContext
│       ├── pages/        landing, auth, dashboard, records, access, verification, audit, AI, profile
│       ├── routes/       router + guards
│       ├── types/        shared types
│       └── utils/        formatting + status styles
├── sui/                Move package for the integrity anchor
├── scripts/            dev runner, build/test/typecheck helpers (no npm nesting)
├── docs/API.md         full REST reference
└── docker-compose.yml  mongo + api + web
```

---

## Quick start

```bash
npm install
npm run dev
```

That is it. `npm run dev` creates `backend/.env` with freshly generated secrets if it does not exist,
checks that the ports are free, then starts both servers:

- **Frontend** → <http://localhost:5173>
- **Backend** → <http://localhost:4000> (health: <http://localhost:4000/api/v1/health>)

It prints a `Ready` banner with the exact URL when both are up. Keep the terminal open, then register an
account in the browser.

### Prerequisites

- **Node.js 20+**
- **MongoDB** running locally — Windows: `net start MongoDB`, macOS: `brew services start mongodb-community`,
  Linux: `sudo systemctl start mongod` — **or** a MongoDB Atlas connection string.

If MongoDB is not running, the API prints exactly what to do and exits; the frontend then shows an orange
"Backend is not running" banner with the fix instead of a raw "Bad gateway".

### Optional configuration

Everything below has a working default, so you can skip it entirely.

| To enable | Do this |
| --- | --- |
| MongoDB Atlas | set `MONGODB_URI` in `backend/.env` |
| Real Sui anchoring | set `SUI_PACKAGE_ID` / `SUI_REGISTRY_ID` — see [`sui/README.md`](sui/README.md) |
| AI assistant | set `OPENAI_API_KEY` in `backend/.env` |

To reset the configuration, delete `backend/.env` and run `npm run setup`.

### Running one server at a time

```bash
npm run dev:backend    # API only,  with watch-reload
npm run dev:frontend   # web client only
```

### Other commands

```bash
npm run setup          # create backend/.env with generated secrets (idempotent)
npm test               # 97 unit + integration + security regression tests
npm run test:coverage  # coverage report
npm run smoke          # boots the built server and walks the full flow over HTTP
npm run build          # production build of both apps
npm run typecheck      # strict TypeScript check for both apps
```

> **Note on the root scripts.** Every root script is a plain `node scripts/*.js` file rather than an
> `npm run --workspace ...` chain. Some Windows Node installations ship no `npm.cmd` next to `node.exe`
> (only `npm` and `npm.ps1`), which makes any script that shells out to `npm` again fail with
> `'npm' is not recognized`. Running the binaries directly avoids that class of failure entirely.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Bad gateway" / "Backend is not running" banner | API process is not running | Run `npm run dev` from the project root and **keep the terminal open** |
| `Cannot start - ports already in use` | Another dev server is running | Use the already-running one, or `Get-Process node \| Stop-Process -Force` |
| `localhost:5173` fails but the server is running | IPv6/IPv4 mismatch on Windows | Already handled: the dev server listens on all interfaces. If it persists, use <http://127.0.0.1:5173> |
| API exits: "Could not connect to MongoDB" | No database reachable | `net start MongoDB` (Windows), or start Docker/Atlas and set `MONGODB_URI` |
| `'npm' is not recognized` inside a script | Broken Node install without `npm.cmd` | Root scripts no longer shell out to npm; if you add your own, use `node scripts/...` |
| Port 4000 already in use | Another process owns it | Stop it, or change `PORT` in `backend/.env` |
| AI assistant shows "Offline" | No `OPENAI_API_KEY` | Expected by default — add the key to enable it |
| Verification shows "Chain unavailable" | Sui Move package not published | Expected by default — see [`sui/README.md`](sui/README.md) |

---

## Walkthrough (2-minute demo)

1. **Register a patient** and **a doctor** (use a second browser or an incognito window).
2. As the **patient**: upload a `.txt`/`.pdf` record.
   → The API computes SHA-256, encrypts with AES-256-GCM, stores the ciphertext, and anchors the digest.
3. Open **Verification** → the record shows its stored digest and anchor status.
4. As the **doctor**: open **Access requests** → pick the patient → state a clinical reason → send.
5. As the **patient**: approve with a duration (e.g. 7 days).
6. As the **doctor**: the record is now listed, viewable and downloadable. Try to delete it → **403**.
7. As the **patient**: revoke access → the doctor's record disappears immediately.
8. Open **Audit trail** on both accounts → every action above, including the denied attempts.

---

## Security model

### Record lifecycle

```
multipart upload
  → type + size validation
  → SHA-256(plaintext)                    ← the digest that will be anchored
  → AES-256-GCM(plaintext)                ← what actually gets stored
  → MongoDB persist (ciphertext + metadata)
  → Sui anchor(store digest, record id, patient id)
  → persist transaction/object metadata
  → audit event
```

Download is the mirror image: `authenticate → authorize → fetch ciphertext → decrypt → respond → audit`.

### Authorization rules

| Actor | Rule |
| --- | --- |
| Patient | May read/write/delete **only their own** records |
| Doctor | Requires an `APPROVED` **and** unexpired `AccessRequest` |
| Doctor | Never permitted to update or delete a patient record |
| `REJECTED` / `REVOKED` / expired | Never authorize a protected operation |
| Audit endpoints | A caller only ever sees their own trail |

Authentication alone never grants access. Role checks and ownership/consent checks are separate concerns and
both run server-side; the frontend role checks are cosmetic.

### Hardening in place

Helmet headers · restricted CORS (no wildcards) · rate limiting (stricter on auth) · bcrypt password
hashing · memory-only uploads with a MIME allow-list and size cap · zod validation on body/query/params ·
constant-ish-time login comparison · centralised error envelope that never leaks stack traces or DB details ·
keys sourced from the environment and never returned by the API.

### CORS and reverse proxies

Browsers send an `Origin` header on **every** non-GET request — including same-origin ones sent to
`/api` through nginx. The API therefore accepts a request when the origin is on the `CORS_ORIGIN`
allow-list **or** matches the host the request was made to (via `Host` / `X-Forwarded-Host`). A genuinely
disallowed cross-origin write is rejected with a clean `403 CORS_ORIGIN_DENIED` rather than a 500.

---

## Blockchain anchoring

The digest is anchored, never the document.

```move
// sui/sources/medical_record_anchor.move
public struct MedicalRecordAnchor has key, store {
    id: UID,
    record_id: String,
    record_hash: String,   // SHA-256 hex
    patient: String,
    created_at: u64,
}
```

Publish it and point the backend at it — see [`sui/README.md`](sui/README.md):

```env
SUI_NETWORK=testnet
SUI_PACKAGE_ID=0x...
SUI_REGISTRY_ID=0x...
SUI_ENV_MNEMONIC=...      # runtime only, never committed
```

### Verification results

| Status | Meaning |
| --- | --- |
| `VERIFIED` | The digest read back from chain equals the digest in MongoDB |
| `MISMATCH` | The digests differ — the record no longer matches its anchor |
| `NOT_ANCHORED` | The record has no anchor yet |
| `UNAVAILABLE` | The digests agree locally, but the chain could not be read (package not configured / node unreachable) |

`UNAVAILABLE` is deliberate. The system reports what it can actually prove rather than implying a
blockchain-backed guarantee it does not have.

---

## AI assistant

`POST /api/v1/ai/analyze` — the browser calls the backend, the backend calls the provider. **The provider key
never reaches the client.**

Structured output: `summary`, `keyFindings[]`, `terminology[]`, `patientFriendlyExplanation`,
`suggestedQuestions[]`, `urgency`, plus a mandatory disclaimer. The prompt explicitly forbids diagnosis and
prescription, and the response is re-validated and clamped before it is returned.

If no key is configured the endpoint returns `503 AI_NOT_CONFIGURED` — a controlled error, not a crash.

---

## Testing

```bash
npm test                  # 97 tests
npm run test:coverage     # coverage report
npm run smoke             # real HTTP end-to-end flow
```

**Unit** — encryption (round-trip, unique IV, tamper detection), SHA-256, JWT, extraction helpers.

**Integration** — auth, record CRUD/upload/download, access-request lifecycle, audit authorization, AI
controlled failure, health.

**Security regression** (the cases that matter most):

| Scenario | Expected |
| --- | --- |
| Approved, unexpired doctor reads a record | `200` |
| Doctor with a pending request reads | `403 ACCESS_PENDING` |
| Doctor who never requested reads | `403 NO_ACCESS` |
| Doctor reads after revocation | `403` |
| Doctor reads after expiry | `403 ACCESS_EXPIRED` |
| Patient B reads patient A's record | `403` |
| Doctor updates/deletes a patient record | `403` |
| Missing / invalid / tampered JWT | `401` |
| One approved doctor inheriting another's access | `403` |
| Audit trail of another actor | empty |
| Same-origin write through a reverse proxy | allowed |
| Disallowed cross-origin write | `403 CORS_ORIGIN_DENIED` |

---

## Deployment

```bash
cp backend/.env.example .env    # fill in secrets
docker compose up --build
```

- `api` → <http://localhost:4000> (health: `/api/v1/health`)
- `web` → <http://localhost:8080> (nginx, SPA fallback, same-origin `/api` proxy)
- `mongodb` → local instance; swap `MONGODB_URI` for MongoDB Atlas in production

All secrets are injected at runtime. `.env` is git-ignored; nothing sensitive is baked into an image.

For production, terminate TLS in front of both services and set `CORS_ORIGIN` to your exact origin.

---

## Configuration reference

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/medichain` | Local or Atlas |
| `JWT_SECRET` | — | **Required in production** (≥32 chars) |
| `JWT_EXPIRES_IN` | `2h` | Token lifetime |
| `ENCRYPTION_KEY` | — | 64 hex chars (32 bytes) |
| `ENCRYPTION_PASSPHRASE` | falls back to JWT secret | Used to derive a key if `ENCRYPTION_KEY` is empty |
| `MAX_FILE_SIZE_MB` | `10` | Upload cap |
| `ALLOWED_MIME_TYPES` | pdf, png, jpeg, txt, json, csv | Upload allow-list |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated, no wildcards |
| `RATE_LIMIT_MAX` | `300` / 15 min | Global API limit |
| `AUTH_RATE_LIMIT_MAX` | `20` / 15 min | Auth endpoint limit |
| `SUI_NETWORK` | `testnet` | `testnet` / `mainnet` / `devnet` |
| `SUI_PACKAGE_ID` | — | Empty ⇒ simulated anchors |
| `SUI_REGISTRY_ID` | — | Shared `MedicalRecordRegistry` id |
| `OPENAI_API_KEY` | — | Empty ⇒ controlled `503` |
| `OPENAI_MODEL` | `gpt-4o-mini` | AI model |

---

## API

Full reference: [`docs/API.md`](docs/API.md). Every success response uses
`{ "success": true, "data": ... }` and every error uses
`{ "success": false, "error": { "code", "message", "details? } }`.

---

## Honest limitations

- **Not a medical device.** The AI explains documents; it does not diagnose or treat.
- **Not regulatory compliant.** No HIPAA/GDPR certification, no formal risk management, no penetration test.
- **Text extraction is limited.** The AI reads `txt`/`csv`/`json`/`markdown` inline; PDFs and images are
  stored and served but not parsed.
- **Simulated anchors by default.** Real chain verification requires publishing the Move package and
  supplying funded testnet keys.
- **Key rotation is not implemented.** `ENCRYPTION_KEY_VERSION` is recorded per record, but there is no
  re-encryption job yet.
- **No refresh tokens.** Sessions end with the access token; a password change re-issues one.
- **No document versioning.** Editing metadata does not re-hash the file.

---

## Tech stack

**Backend** — Node.js · Express · TypeScript · Mongoose · Zod · jsonwebtoken · bcryptjs · Helmet ·
express-rate-limit · Multer · OpenAI SDK · `@mysten/sui` (`SuiGrpcClient` + JSON-RPC)
**Frontend** — React 18 · TypeScript · Vite · React Router · Tailwind · Framer Motion ·
React Three Fiber / Drei · Lucide · Axios
**Testing** — Jest · Supertest · `mongodb-memory-server`
**Infrastructure** — Docker · nginx · MongoDB Atlas

---

## License

MIT — for portfolio and educational use.

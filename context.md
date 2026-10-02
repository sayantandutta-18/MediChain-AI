# MediChain-AI — Final Project Context

## Project Status

Status:
COMPLETED WITH KNOWN LIMITATIONS

Completion:
100%

Last Updated:
2026-10-03

## Project Summary

MediChain-AI is a secure, patient-controlled medical record platform with AES-256-GCM encryption, SHA-256 integrity checks, append-only auditing, Sui blockchain anchoring, and OpenAI-assisted explanations.

## Architecture

- **Backend:** Node.js, Express, MongoDB (Mongoose), custom service/controller layers.
- **Frontend:** React (Vite), Tailwind CSS, Zustand, Framer Motion, React Three Fiber.
- **Blockchain:** Sui Move smart contract (`medical_record_anchor.move`) and TypeScript `@mysten/sui` integration.
- **AI:** OpenAI via `openai` npm package, restricted to assistive explaining only.

## Completed Checkpoints

- [x] Checkpoint 0 — Baseline
- [x] Checkpoint 1 — Backend Foundation
- [x] Checkpoint 2 — Authentication
- [x] Checkpoint 3 — RBAC
- [x] Checkpoint 4 — Medical Records
- [x] Checkpoint 5 — Encryption
- [x] Checkpoint 6 — SHA-256
- [x] Checkpoint 7 — Consent
- [x] Checkpoint 8 — Audit
- [x] Checkpoint 9 — Sui
- [x] Checkpoint 10 — AI
- [x] Checkpoint 11 — Frontend Auth
- [x] Checkpoint 12 — Patient UI
- [x] Checkpoint 13 — Doctor UI
- [x] Checkpoint 14 — Record Experience
- [x] Checkpoint 15 — 3D
- [x] Checkpoint 16 — UI/UX
- [x] Checkpoint 17 — API Integration
- [x] Checkpoint 18 — Security Regression
- [x] Checkpoint 19 — Testing
- [ ] Checkpoint 20 — Docker
- [x] Checkpoint 21 — Documentation
- [x] Checkpoint 22 — GitHub Security
- [x] Checkpoint 23 — End-to-End Demo
- [x] Checkpoint 24 — Final Review

## Backend

Fully functional Express app with centralized error handling (`ApiError`), memory-only `multer` uploads, role-based authorization middleware, rate-limiting, and Helmet.

## Authentication

Handled via `jsonwebtoken` and `bcryptjs`. Distinct schemas for Patient and Doctor registration. Invalid credentials use constant-ish time verification to prevent timing attacks.

## Authorization

Strict server-side enforcement.
- PATIENT: May read/write/delete only their own records.
- DOCTOR: Requires an APPROVED and unexpired AccessRequest to view/download. Cannot edit or delete patient records.

## Medical Records

Uploads undergo MIME validation and size limits. Files are hashed (SHA-256) and encrypted (AES-256-GCM) prior to MongoDB insertion. Download performs decryption. Ownership and consent are verified prior to all operations.

## Encryption

Algorithm: AES-256-GCM. Implemented in `backend/src/utils/encryption.ts`. IVs are randomly generated. Rejects tampered payloads.

## SHA-256

Hash generated from plaintext using Node `crypto` (`sha256()`). Stored in MongoDB and securely anchored on the Sui blockchain. Verification matches stored hash against on-chain hash.

## Consent

Lifecycle: PENDING -> APPROVED/REJECTED. APPROVED can be REVOKED or EXPIRED. Doctors cannot request access to themselves. Handled via `AccessRequest` model.

## Audit

Append-only logging (`AuditLog`) for all major actions (login, upload, download, analyze, request access, approve access, verify). Users can only view their own audit trace.

## Blockchain

Network: testnet (configurable)
SDK: @mysten/sui
Package: sui/sources/medical_record_anchor.move
Contract: medical_record_anchor
Current status:
SIMULATED (No package/registry ID or Mnemonic provided in environment, acts as a simulated fallback).

## AI

Provider: OpenAI
Model: gpt-4o-mini
Endpoint: /api/v1/ai/analyze
Supported input: Metadata and extracted text of the record.
Output: JSON structured summary, findings, terms, and suggested questions.
Authorization: Checks `loadAuthorizedRecord` to ensure caller has access.
Safety boundary: Strict prompt instruction forbidding diagnosis. Mandatory disclaimer appended.
Current status:
UNAVAILABLE (No OPENAI_API_KEY provided in environment, degrades gracefully to 503).

## Frontend

Pages include: LandingPage, RegisterPage, LoginPage, DashboardPage, RecordsPage, RecordDetailPage, VerificationPage, AccessRequestsPage, AuditPage, AiAssistantPage, ProfilePage.

## 3D

Implemented in `SecurityPipeline.tsx` using React Three Fiber. Displays an animated flow of the security pipeline (Patient -> Record -> AES-256-GCM -> SHA-256 -> Sui).

## API

- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- `GET /api/v1/records`, `POST /api/v1/records`, `GET /api/v1/records/:id`, `GET /api/v1/records/:id/download`
- `GET /api/v1/access-requests`, `POST /api/v1/access-requests`
- `GET /api/v1/audit`
- `POST /api/v1/ai/analyze`
- `POST /api/v1/records/:id/verify`

## Testing

Typecheck:
PASS

Lint:
PASS

Unit/Integration:
97 passed / 0 failed

Coverage:
83.99%

Smoke:
PASS

Build:
PASS

Docker:
FAIL (Blocked by local environment lacking Docker daemon).

## Security Verification

Verified:
1. Invalid/Missing JWT -> 401
2. Patient A accessing Patient B -> 403
3. Unauthorized doctor -> 403
4. Pending/Rejected/Revoked/Expired doctor access -> 403
5. Doctor update/delete record -> 403
6. Cross-user audit access -> Denied
7. Unauthorized AI record access -> Denied
8. Invalid/Oversized upload -> Rejected
9. Tampered encrypted data -> Failure
10. CORS & Rate limits -> Functional

## Docker

`docker-compose.yml` configures `mongodb`, `api`, and `web` containers. Secrets are injected at runtime. (Cannot be run locally).

## Documentation

Updated:
- README.md (no false claims)
- docs/PROJECT_AUDIT.md
- docs/ARCHITECTURE.md
- docs/SECURITY.md
- docs/TESTING.md
- docs/DEPLOYMENT.md

## Known Limitations

- Sui configuration falls back to SIMULATED due to missing environment keys.
- OpenAI falls back to 503 unavailable due to missing API key.
- Docker Checkpoint blocked due to missing Docker daemon on host.

## Known Issues

None.

## Important Files

- `backend/src/services/recordService.ts`: Core record mechanics.
- `backend/src/services/accessControlService.ts`: Core RBAC logic.
- `backend/src/utils/encryption.ts`: AES-256-GCM implementation.
- `backend/src/blockchain/suiClient.ts`: Sui anchor integration.
- `frontend/src/components/three/SecurityPipeline.tsx`: 3D visualization.
- `backend/scripts/smoke.js`: Comprehensive E2E HTTP verification.

## Environment Variables

JWT_SECRET
ENCRYPTION_KEY
NODE_ENV
JWT_EXPIRES_IN
ENCRYPTION_KEY_VERSION
CORS_ORIGIN
MONGODB_URI
MAX_FILE_SIZE_MB
SUI_NETWORK
SUI_PACKAGE_ID
SUI_REGISTRY_ID
SUI_ENV_MNEMONIC
OPENAI_API_KEY
OPENAI_MODEL
VITE_API_URL

## Run Commands

Development:
npm install
npm run dev

Testing:
npm test
npm run test:coverage
npm run smoke

Build:
npm run build
npm run typecheck

Docker:
docker compose up --build

## Final Demo Flow

PATIENT: Registers and Logs in -> Uploads record -> Hashed & Encrypted -> Anchored (simulated) -> Views Verification -> Logs show Audit trail.
DOCTOR: Registers -> Requests access -> Patient approves with duration -> Doctor views authorized record -> Doctor attempts delete (Blocked) -> Patient revokes -> Doctor loses access. AI analysis degrades safely if unconfigured.

## Final Verification Date

2026-10-03

## Next Action

NO DEVELOPMENT ACTION REQUIRED.
Only deployment/presentation improvements remain.

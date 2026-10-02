
# 🏥 MediChain-AI

> **Patient-controlled medical records with encryption, cryptographic integrity verification, Sui blockchain anchoring, consent-based doctor access, auditability, and AI-assisted medical report understanding.**

MediChain-AI is a **production-style full-stack MVP and portfolio project** designed around one core idea:

> **The patient controls who can access their medical records.**

The platform combines traditional backend security with cryptography, blockchain integrity verification, consent management, audit logging, and an AI assistant that explains medical reports in patient-friendly language.

⚠️ **Important:** This project is a portfolio/educational MVP. It is **not** a certified clinical system, medical device, diagnostic system, or regulatory-compliant healthcare platform.

---

## ✨ Key Features

### 🔐 Secure Authentication

- JWT Bearer authentication
- bcrypt password hashing
- JWT issuer validation
- JWT audience validation
- Token expiry enforcement
- Protected API routes
- Role-based authentication

### 👤 Role-Based Access Control

The system currently supports:

- **PATIENT**
- **DOCTOR**

Authorization is enforced on the backend.

The frontend does not determine access permissions.

---

## 🏥 Patient-Controlled Medical Records

Patients can:

- Upload medical records
- View their own records
- Update record metadata
- Delete their own records
- Download their documents
- Verify document integrity
- Manage doctor access
- View audit history

A patient can only access resources belonging to their own account.

---

## 👨‍⚕️ Doctor Access Through Consent

Doctors cannot automatically access patient records.

The access flow is:

```text
Doctor
   ↓
Requests access
   ↓
Patient receives request
   ↓
Patient approves / rejects
   ↓
Approved access gets an expiry
   ↓
Doctor can access records
   ↓
Patient can revoke access anytime
```

### Access States

- `PENDING`
- `APPROVED`
- `REJECTED`
- `REVOKED`
- `EXPIRED`

The backend checks both:

1. Doctor identity
2. Patient consent

for every protected record operation.

### Doctor Restrictions

Even when access is approved:

```text
VIEW ✅
DOWNLOAD ✅
UPDATE ❌
DELETE ❌
```

---

# 🔒 Data Security Architecture

Medical documents are **never stored directly as plaintext**.

Record lifecycle:

```text
Medical File
     │
     ▼
Upload Validation
     │
     ├── MIME validation
     └── File size validation
     │
     ▼
SHA-256 Hash
     │
     ▼
AES-256-GCM Encryption
     │
     ▼
MongoDB
     │
     ├── Encrypted File
     ├── Metadata
     ├── SHA-256 Digest
     └── Encryption Version
     │
     ▼
Sui Blockchain Anchor
     │
     └── Digest + Opaque Record Information
     │
     ▼
Audit Log
```

### Encryption

Documents are encrypted using:

```text
AES-256-GCM
```

The plaintext file is hashed before encryption:

```text
SHA-256(plaintext)
```

The encrypted ciphertext is what gets persisted.

---

# 🔍 Cryptographic Integrity Verification

Every uploaded document receives a SHA-256 digest.

Example:

```text
a20f2002a3d6ff06fe040d485f4f093ec573ec941846e5a5eec7828dc587357d
```

That digest is stored in MongoDB and can also be anchored on Sui.

During verification:

```text
MongoDB Hash
      │
      ▼
Compare
      ▲
      │
Sui Blockchain Hash
```

Possible verification results:

| Status | Meaning |
|---|---|
| `VERIFIED` | MongoDB digest matches the blockchain digest |
| `MISMATCH` | Stored digest and blockchain digest differ |
| `NOT_ANCHORED` | No blockchain anchor exists |
| `UNAVAILABLE` | Blockchain verification cannot currently be completed |

The system does not claim blockchain verification when the chain is unavailable.

---

# ⛓️ Sui Blockchain Integration

MediChain-AI uses the **Sui blockchain** for document integrity anchoring.

The actual medical document is **never written to the blockchain**.

Only information required for integrity verification is anchored, such as:

```text
Record ID
SHA-256 Hash
Patient Identifier
Timestamp
```

### Move Contract

The project contains a Move package under:

```text
sui/
```

Main contract:

```text
sui/sources/medical_record_anchor.move
```

The contract creates a:

```text
MedicalRecordAnchor
```

object representing the integrity anchor of a record.

### Blockchain Architecture

```text
Backend
   │
   ▼
Sui Client
   │
   ▼
Sui Network
   │
   ▼
MedicalRecordAnchor
   │
   ├── Record ID
   ├── SHA-256 Hash
   ├── Patient
   └── Created At
```

### Blockchain Modes

The project can run without blockchain configuration.

```text
SUI_PACKAGE_ID not configured
        ↓
Simulated anchor mode
```

With the required Sui configuration:

```text
SUI_PACKAGE_ID
SUI_REGISTRY_ID
SUI_NETWORK
```

the backend can use real blockchain anchoring.

---

# 🤖 AI Medical Report Assistant

MediChain-AI includes an AI-powered report understanding assistant.

API:

```http
POST /api/v1/ai/analyze
```

The browser never receives the provider API key.

Architecture:

```text
React Frontend
      │
      ▼
Backend API
      │
      ▼
AI Provider
      │
      ▼
Structured Response
      │
      ▼
Frontend
```

### AI Response

The AI can return:

- Summary
- Key findings
- Medical terminology explanations
- Patient-friendly explanation
- Suggested questions
- Urgency indication
- Safety disclaimer

Example structure:

```json
{
  "summary": "...",
  "keyFindings": [],
  "terminology": [],
  "patientFriendlyExplanation": "...",
  "suggestedQuestions": [],
  "urgency": "routine",
  "disclaimer": "..."
}
```

### AI Safety Boundary

The AI is designed to:

✅ Explain reports  
✅ Simplify medical terminology  
✅ Summarize information  
✅ Suggest questions for a doctor  

It is not designed to:

❌ Diagnose diseases  
❌ Prescribe medicine  
❌ Replace a physician  
❌ Provide definitive clinical decisions  

When the AI provider is not configured, the API returns a controlled error:

```text
503 AI_NOT_CONFIGURED
```

instead of crashing.

---

# 📜 Audit Trail

MediChain-AI maintains an append-only audit trail for important actions.

Examples include:

```text
LOGIN
REGISTER
RECORD_CREATED
RECORD_VIEWED
RECORD_UPDATED
RECORD_DELETED
RECORD_DOWNLOADED
ACCESS_REQUESTED
ACCESS_APPROVED
ACCESS_REJECTED
ACCESS_REVOKED
AI_ANALYSIS
VERIFICATION
```

The audit system helps answer:

```text
Who?
Did what?
To which resource?
When?
```

Users can only access the audit information authorized for their account.

---

# 🧱 Project Architecture

```text
                    ┌──────────────────────┐
                    │    React Frontend    │
                    │ React + TypeScript   │
                    │ Tailwind + Vite      │
                    └──────────┬───────────┘
                               │
                               │ REST / HTTPS
                               ▼
                    ┌──────────────────────┐
                    │    Express API       │
                    │ Node.js + TypeScript │
                    └──────────┬───────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
     Authentication       Authorization        Services
       JWT/Bcrypt          RBAC/Consent        Business Logic
           │                   │                   │
           └───────────────────┼───────────────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
          MongoDB          Encryption         Audit Logs
                             AES-256
                                │
                                ▼
                           SHA-256 Hash
                                │
                                ▼
                         Sui Blockchain
                                │
                                ▼
                          AI Integration
```

---

# 📁 Repository Structure

```text
MediChain-AI/
│
├── backend/
│   ├── src/
│   │   ├── blockchain/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── tests/
│   └── scripts/
│
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── routes/
│       ├── types/
│       └── utils/
│
├── sui/
│   ├── sources/
│   │   └── medical_record_anchor.move
│   ├── Move.toml
│   └── README.md
│
├── scripts/
│
├── docs/
│   └── API.md
│
├── docker-compose.yml
├── package.json
├── package-lock.json
└── README.md
```

---

# 🖥️ Frontend

The frontend is built using:

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Framer Motion
- React Three Fiber
- Drei
- Lucide Icons
- Axios

### Frontend Areas

The application contains pages for:

```text
Landing
Login
Register
Dashboard
Medical Records
Access Requests
Verification
Audit Trail
AI Assistant
Profile
```

The frontend uses centralized API clients rather than making arbitrary requests throughout components.

---

# 🧩 Backend

Backend stack:

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Zod
- Helmet
- express-rate-limit
- Multer
- OpenAI SDK
- Sui SDK

The backend is organized into:

```text
Controllers
      ↓
Services
      ↓
Models
      ↓
Database
```

This keeps HTTP handling separate from business logic.

---

# 🛡️ Security Hardening

The backend includes several security layers.

### HTTP Security

Helmet is used for secure HTTP headers.

### CORS

CORS is restricted using an allow-list.

Wildcard CORS is not used.

### Rate Limiting

Rate limiting is applied globally, with stricter limits for authentication endpoints.

### Validation

Request data is validated using:

```text
Zod
```

Validation covers:

- body
- query parameters
- route parameters

### File Upload Security

Uploads are:

- memory-only
- MIME validated
- size limited
- processed before persistence

Default maximum:

```text
10 MB
```

Allowed file types include:

```text
PDF
PNG
JPEG
TXT
JSON
CSV
```

### Error Handling

The backend returns controlled error responses without exposing:

- stack traces
- database details
- internal secrets

---

# 🔑 Environment Configuration

Sensitive values are stored in environment variables.

Example:

```env
PORT=4000
MONGODB_URI=...
JWT_SECRET=...
ENCRYPTION_KEY=...
JWT_EXPIRES_IN=2h

SUI_NETWORK=testnet
SUI_PACKAGE_ID=...
SUI_REGISTRY_ID=...

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

### Important

Never commit:

```text
.env
private keys
wallet mnemonics
JWT secrets
encryption keys
API keys
database credentials
```

`.env` should remain inside `.gitignore`.

Use `.env.example` for documentation.

---

# 🚀 Quick Start

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/MediChain-AI.git
cd MediChain-AI
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Start the Application

```bash
npm run dev
```

The development environment starts:

```text
Frontend → http://localhost:5173
Backend  → http://localhost:4000
```

Health endpoint:

```text
http://localhost:4000/api/v1/health
```

---

# 🗄️ MongoDB

MongoDB must be running locally or a MongoDB Atlas URI must be configured.

### Local MongoDB

Windows:

```bash
net start MongoDB
```

macOS:

```bash
brew services start mongodb-community
```

Linux:

```bash
sudo systemctl start mongod
```

The project can also use MongoDB Atlas through:

```env
MONGODB_URI=your_connection_string
```

---

# ⚙️ Available Commands

```bash
npm run dev
```

Start frontend and backend together.

```bash
npm run dev:backend
```

Start backend only.

```bash
npm run dev:frontend
```

Start frontend only.

```bash
npm run setup
```

Create configuration with generated development secrets.

```bash
npm test
```

Run automated tests.

```bash
npm run test:coverage
```

Generate test coverage.

```bash
npm run smoke
```

Run end-to-end HTTP smoke tests.

```bash
npm run build
```

Build frontend and backend.

```bash
npm run typecheck
```

Run TypeScript checks.

---

# 🧪 Testing

Testing covers:

### Unit Testing

Examples:

- AES encryption/decryption
- IV uniqueness
- Authentication helpers
- SHA-256 hashing
- JWT utilities
- Data extraction helpers

### Integration Testing

Examples:

- Registration
- Login
- `/auth/me`
- Medical record CRUD
- Upload
- Download
- Doctor access requests
- Patient approval
- Rejection
- Revocation
- Audit logging
- AI controlled failure
- Health endpoints

### Security Regression Testing

Important scenarios include:

| Scenario | Expected Result |
|---|---|
| Approved doctor reads record | `200` |
| Pending doctor reads record | `403` |
| Unauthorized doctor reads record | `403` |
| Revoked doctor reads record | `403` |
| Expired access reads record | `403` |
| Patient B reads Patient A's record | `403` |
| Doctor updates patient record | `403` |
| Doctor deletes patient record | `403` |
| Invalid JWT | `401` |
| Tampered JWT | `401` |
| Cross-patient access | `403` |
| Disallowed CORS write | `403` |

---

# 🔄 Example Medical Record Flow

### Patient Upload

```text
Patient Login
     ↓
Upload Medical File
     ↓
Validate File
     ↓
Generate SHA-256
     ↓
Encrypt with AES-256-GCM
     ↓
Store in MongoDB
     ↓
Anchor Digest on Sui
     ↓
Create Audit Event
```

### Patient Verification

```text
Patient
   ↓
Open Record
   ↓
Verify Integrity
   ↓
MongoDB Digest
   │
   ├──────── Compare ────────┐
   │                         │
   ▼                         ▼
Stored Hash             Blockchain Hash
   │                         │
   └──────────┬──────────────┘
              ▼
        Verification Result
```

---

# 👨‍⚕️ Doctor Access Flow

```text
Doctor
  │
  ▼
Select Patient
  │
  ▼
Request Access
  │
  ▼
Patient Approval
  │
  ▼
Expiry Assigned
  │
  ▼
Doctor Can View/Download
  │
  ▼
Patient Revokes
  │
  ▼
Access Denied
```

Every important transition is written to the audit trail.

---

# 🧑‍💻 API Overview

Base API:

```text
/api/v1
```

Main API areas:

```text
/auth
/records
/access-requests
/audit-logs
/ai
/wallet
/health
```

Example:

```http
GET /api/v1/auth/me
```

Record verification:

```http
GET /api/v1/records/:id/verify
```

Download:

```http
GET /api/v1/records/:id/download
```

AI:

```http
POST /api/v1/ai/analyze
```

For the complete API specification:

```text
docs/API.md
```

---

# 🐳 Docker Deployment

The project includes:

```text
docker-compose.yml
```

Services:

```text
MongoDB
API
Frontend
```

Build and run:

```bash
docker compose up --build
```

Services:

```text
API       → http://localhost:4000
Frontend  → http://localhost:8080
MongoDB   → localhost:27017
```

The frontend uses nginx with SPA fallback and API proxy support.

Secrets are injected at runtime instead of being baked into the Docker image.

---

# 📊 Demo Flow

A simple end-to-end demo:

### Step 1

Register a patient.

### Step 2

Register a doctor.

### Step 3

Patient uploads a medical record.

### Step 4

Backend:

```text
SHA-256
   ↓
AES-256-GCM
   ↓
MongoDB
   ↓
Blockchain Anchor
```

### Step 5

Patient opens the verification page.

### Step 6

Doctor sends an access request.

### Step 7

Patient approves access for a limited period.

### Step 8

Doctor can now:

```text
View ✅
Download ✅
```

but cannot:

```text
Update ❌
Delete ❌
```

### Step 9

Patient revokes access.

### Step 10

Doctor loses access.

### Step 11

Open the audit trail to inspect the complete activity history.

---

# 🧠 Why Blockchain?

Blockchain is **not** used to store the medical document.

Instead, it provides an external integrity anchor.

Traditional storage:

```text
Database
   ↓
Stored Hash
```

Blockchain-backed integrity:

```text
Database Hash
     │
     ├──────────────┐
     │              │
     ▼              ▼
 MongoDB          Sui
     │              │
     └──── Compare ─┘
```

If the hashes match, the system can verify that the anchored digest matches the stored record digest.

---

# 🧭 Design Principles

MediChain-AI follows several architectural principles:

### Patient-first ownership

The patient owns the record access relationship.

### Least privilege

Users only receive the access required for their role and current consent.

### Defense in depth

Security does not depend on one mechanism.

```text
JWT
+
RBAC
+
Ownership
+
Consent
+
Encryption
+
Hashing
+
Audit Logging
+
Rate Limiting
+
Validation
```

### Server-side authorization

Frontend checks are only for user experience.

The backend remains the final authority.

### Privacy by design

Medical files remain off-chain.

Sensitive secrets remain server-side.

---

# ⚠️ Honest Limitations

This project is intentionally described as a **production-style MVP**, not as a production healthcare platform.

Current limitations include:

- Not a medical device
- Not a diagnostic system
- Not a treatment system
- Not formally HIPAA/GDPR certified
- No formal penetration test
- No formal clinical validation
- PDF/image content is stored and served but not fully parsed by the AI assistant
- Blockchain can run in simulated mode when not configured
- Encryption key rotation workflow is not implemented
- Refresh tokens are not implemented
- Document versioning is not implemented
- Editing metadata does not re-hash the underlying document

---

# 🛣️ Future Roadmap

Potential future improvements:

```text
├── PDF / image OCR + structured extraction
├── Advanced document versioning
├── Encryption key rotation
├── Refresh-token based authentication
├── Multi-factor authentication
├── Hardware-backed key management
├── More advanced blockchain registry architecture
├── Real-time access notifications
├── Email notification system
├── Mobile application
├── Doctor verification workflow
├── Healthcare organization support
├── Advanced analytics
└── Formal security / compliance program
```

These are future directions and are not represented as currently implemented functionality.

---

# 🧰 Tech Stack

## Frontend

```text
React 18
TypeScript
Vite
React Router
Tailwind CSS
Framer Motion
React Three Fiber
Drei
Lucide
Axios
```

## Backend

```text
Node.js
Express
TypeScript
Mongoose
MongoDB
JWT
bcryptjs
Zod
Helmet
express-rate-limit
Multer
OpenAI SDK
Sui SDK
```

## Blockchain

```text
Sui
Move
SuiGrpcClient
JSON-RPC
```

## Testing

```text
Jest
Supertest
MongoDB Memory Server
```

## Infrastructure

```text
Docker
Docker Compose
nginx
MongoDB / MongoDB Atlas
```

---

# 📐 High-Level Security Model

```text
                USER
                 │
                 ▼
        ┌─────────────────┐
        │ Authentication  │
        │ JWT + bcrypt    │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Authorization   │
        │ RBAC            │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Ownership /     │
        │ Consent Check   │
        └────────┬────────┘
                 │
          ┌──────┴──────┐
          │             │
          ▼             ▼
       Patient        Doctor
          │             │
          ▼             ▼
     Own Records   Approved Access
          │             │
          └──────┬──────┘
                 ▼
        ┌─────────────────┐
        │ Encrypted Data  │
        │ AES-256-GCM     │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Integrity Hash  │
        │ SHA-256         │
        └────────┬────────┘
                 │
          ┌──────┴──────┐
          ▼             ▼
       MongoDB         Sui
          │             │
          └──────┬──────┘
                 ▼
          Audit Trail
```

---

# 🔐 Security Checklist

Before deployment, verify:

```text
[ ] .env is not committed
[ ] API keys are not committed
[ ] Private keys are not committed
[ ] Wallet mnemonic is not committed
[ ] JWT secret is strong
[ ] Encryption key is strong
[ ] CORS origin is restricted
[ ] HTTPS is enabled
[ ] MongoDB credentials are protected
[ ] Rate limits are configured
[ ] Logs do not expose secrets
[ ] Sui credentials are injected at runtime
[ ] AI provider key stays server-side
```

---

# 📚 Documentation

Additional documentation:

```text
docs/API.md
sui/README.md
```

Project documentation also includes:

```text
PRD
TRD
Frontend Documentation
Architecture
Security Model
Testing Strategy
```

---

# 🎯 Project Goal

The long-term goal of MediChain-AI is to demonstrate how modern web technologies can be combined to build a privacy-focused medical data platform around:

```text
Patient Ownership
        +
Secure Authentication
        +
Role-Based Authorization
        +
Consent Management
        +
Encryption
        +
Cryptographic Integrity
        +
Blockchain Anchoring
        +
Auditability
        +
AI-Assisted Understanding
```

---

# 👨‍💻 Author

**Sayantan Dutta**

B.Tech — Computer Science & Engineering (AI/ML)

---

# 📜 License

MIT License

This project is intended for:

- Portfolio use
- Educational purposes
- Demonstration
- Research and experimentation

It should not be used as a replacement for certified healthcare infrastructure.

---

## ⭐ Support

If you find the architecture or implementation useful, consider starring the repository.

```text
MediChain-AI
Secure Medical Records
Patient-Controlled Access
Blockchain Integrity
AI-Assisted Understanding
```
```


git commit -m "docs: add comprehensive project README"
git push
```

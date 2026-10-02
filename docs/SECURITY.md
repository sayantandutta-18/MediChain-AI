# MediChain-AI Security Posture

## Principles
1. **Never persist plaintext**: Medical records are encrypted with AES-256-GCM before database insertion.
2. **Server-side Authorization**: The backend checks role, ownership, and active consent before returning records. The frontend's role routing is cosmetic.
3. **Graceful Degradation**: Missing external configurations (Sui, OpenAI) cause controlled failures or simulations, rather than system crashes or fake successful claims.
4. **Append-Only Audit**: Every significant state change writes an immutable audit record tied to the actor.

## Role-Based Access Control (RBAC)
- **PATIENT**: Can upload, view, download, modify, and delete their own records.
- **DOCTOR**: Cannot upload, modify, or delete patient records. Can view and download records ONLY IF the owning patient has granted an `APPROVED` and unexpired access request.

## Storage and Cryptography
- **Encryption**: AES-256-GCM is used to encrypt record payloads. The IV is randomly generated per record, and the auth tag guarantees ciphertext integrity.
- **Hashing**: SHA-256 digests are calculated on the plaintext and anchored on the blockchain.
- **Passwords**: Hashed with `bcrypt`. Constant-ish time comparison during login mitigates timing attacks.

## Web Vulnerability Mitigation
- **XSS**: Handled by React's default escaping and Helmet CSP (in production).
- **IDOR**: Prevented by strict owner/consent checks in services (e.g. `accessControlService.ts`).
- **CSRF/CORS**: API restricts CORS origins strictly; no wildcard allowed.
- **Rate Limiting**: `express-rate-limit` prevents brute-force login attempts and mitigates DDoS risk.

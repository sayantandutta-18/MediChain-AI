# MediChain-AI Testing Guide

## Test Suites
MediChain-AI uses a comprehensive suite of tests encompassing unit, integration, and end-to-end smoke tests.

- **Unit/Integration Tests (`npm test`)**: Uses Jest. Mocks database connectivity with `mongodb-memory-server` and asserts core service logic, API error states, RBAC enforcement, and encryption mechanics.
- **Security Regression (`npm test`)**: Included in the standard integration test path. Expressly verifies that tampered JWTs, tampered ciphertexts, and unauthorized cross-user accesses are blocked with 401/403 errors.
- **Smoke Tests (`npm run smoke`)**: A scripted e2e validation (`scripts/smoke.js`) running against the compiled Node.js backend. Simulates full patient/doctor registration, document upload, request approval, and blockchain anchoring over real HTTP calls.

## Current Testing Status (Last Run)
- **Typecheck**: PASS
- **Lint**: PASS
- **Unit/Integration**: PASS (97/97 tests pass)
- **Coverage**: PASS
- **Smoke**: PASS
- **Build**: PASS

## How to run
```bash
npm test
npm run test:coverage
npm run smoke
npm run typecheck
npm run build
```

# MediChain-AI Architecture

## Overview
MediChain-AI is a full-stack web application designed for secure, patient-controlled medical records. It integrates AES-256-GCM encryption, SHA-256 integrity hashing, an append-only audit trail, Sui blockchain anchoring (simulated or real), and an assistive AI explainer.

## Backend
- **Node.js + Express**: Central API server routing traffic.
- **MongoDB + Mongoose**: Persistent storage for encrypted records, access requests, and audit logs.
- **Service Layer**: Business logic separated from controllers (`src/services/`).
- **Security Middleware**: Helmet, CORS, and Rate Limiting.

## Frontend
- **React (Vite)**: SPA structure with React Router.
- **Zustand**: Lightweight global state management.
- **Tailwind CSS**: Utility-first styling for responsive design.
- **React Three Fiber**: Used for the 3D security pipeline visualization (`SecurityPipeline.tsx`).
- **Axios**: Centralized API client (`src/api/client.ts`) managing auth headers and 401 unauth handling.

## External Integrations
- **Sui Blockchain**: Custom Move package (`sui/sources/medical_record_anchor.move`) for anchoring document hashes. Integrates via `@mysten/sui` SDK.
- **OpenAI**: Assistive AI explaining medical records securely.

## Data Flow (Upload)
1. Patient uploads document (multipart/form-data).
2. Server validates MIME and size (memory-only `multer`).
3. SHA-256 digest calculated on plaintext.
4. Plaintext encrypted via AES-256-GCM.
5. Ciphertext stored in MongoDB.
6. Plaintext digest anchored on Sui blockchain.
7. Audit event recorded.
